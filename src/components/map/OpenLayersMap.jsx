/**
 * OpenLayers Map Component
 *
 * React wrapper for OpenLayers with:
 * - Tile layers (satellite, flycam)
 * - GeoJSON vector layers
 * - WebGL rendering for performance
 * - Interactive features (click, hover)
 */

import 'ol/ol.css';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Loader2, Layers, ZoomIn, ZoomOut, Maximize2, Navigation, Ruler, Square, X, ChevronUp, ChevronDown, Clock, Route } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { loadPrebuiltGraph, findNearestNode, dijkstra } from '../../utils/roadGraph';

// OpenLayers imports will be dynamic to avoid SSR issues
// Note: Use OLMap to avoid shadowing JavaScript's native Map
let OLMap, View, TileLayer, VectorLayer, WebGLVectorLayer, XYZ, VectorSource, GeoJSON, Style, Stroke, Fill, Text, Circle, Icon;
let fromLonLat, toLonLat, transformExtent, getLength, getArea;
let Draw, Overlay, Feature, Point, LineString, Polygon;
let VectorTileLayer, VectorTileSource, MVT, PMTilesVectorSource;

/**
 * Load OpenLayers modules dynamically
 */
const loadOpenLayers = async () => {
    if (OLMap) return; // Already loaded

    const [
        olMap,
        olView,
        olTileLayer,
        olVectorLayer,
        olWebGLVectorLayer,
        olXYZ,
        olVectorSource,
        olGeoJSON,
        olStyle,
        olProj,
        olSphere,
        olDraw,
        olOverlay,
        olFeature,
        olGeomPoint,
        olGeomLineString,
        olGeomPolygon,
        olVectorTileLayer,
        olMVT,
        olPMTiles
    ] = await Promise.all([
        import('ol/Map').then(m => m.default),
        import('ol/View').then(m => m.default),
        import('ol/layer/Tile').then(m => m.default),
        import('ol/layer/Vector').then(m => m.default),
        import('ol/layer/WebGLVector').then(m => m.default).catch(() => null),
        import('ol/source/XYZ').then(m => m.default),
        import('ol/source/Vector').then(m => m.default),
        import('ol/format/GeoJSON').then(m => m.default),
        import('ol/style'),
        import('ol/proj'),
        import('ol/sphere'),
        import('ol/interaction/Draw').then(m => m.default),
        import('ol/Overlay').then(m => m.default),
        import('ol/Feature').then(m => m.default),
        import('ol/geom/Point').then(m => m.default),
        import('ol/geom/LineString').then(m => m.default),
        import('ol/geom/Polygon').then(m => m.default),
        import('ol/layer/VectorTile').then(m => m.default),
        import('ol/format/MVT').then(m => m.default),
        import('ol-pmtiles').catch(() => null)
    ]);

    OLMap = olMap;
    View = olView;
    TileLayer = olTileLayer;
    VectorLayer = olVectorLayer;
    WebGLVectorLayer = olWebGLVectorLayer || olVectorLayer;
    XYZ = olXYZ;
    VectorSource = olVectorSource;
    GeoJSON = olGeoJSON;
    Style = olStyle.Style;
    Stroke = olStyle.Stroke;
    Fill = olStyle.Fill;
    Text = olStyle.Text;
    Circle = olStyle.Circle;
    Icon = olStyle.Icon;
    fromLonLat = olProj.fromLonLat;
    toLonLat = olProj.toLonLat;
    transformExtent = olProj.transformExtent;
    getLength = olSphere.getLength;
    getArea = olSphere.getArea;
    Draw = olDraw;
    Overlay = olOverlay;
    Feature = olFeature;
    Point = olGeomPoint;
    LineString = olGeomLineString;
    Polygon = olGeomPolygon;
    VectorTileLayer = olVectorTileLayer;
    MVT = olMVT;
    if (olPMTiles) {
        PMTilesVectorSource = olPMTiles.PMTilesVectorSource;
    }
};

/**
 * Map configuration
 */
const MAP_CONFIG = {
    center: [106.645, 12.212], // Default center [lng, lat]
    zoom: 14,
    minZoom: 10,
    maxZoom: 24,
};

/**
 * Tile layer definitions
 * Note: /map/ routes are served by Vite middleware from d:/web/map/
 */
const TILE_LAYERS = {
    google: {
        name: 'Google Hybrid',
        url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        visible: true,
        zIndex: 0,
    },
    flycam: {
        name: 'Flycam (TVS)',
        url: '/map/flycam/{z}/{x}/{y}.webp',
        visible: false,
        zIndex: 1,
        minZoom: 14,
        maxZoom: 22,
    },
};

/**
 * Flycam timeline data - grouped by year
 * Mock data: all point to same tiles. Replace URLs when real multi-temporal data is available.
 */
const FLYCAM_DATA = {
    2025: [
        { month: 12, url: '/map/flycam/{z}/{x}/{y}.webp' },
    ],
    2026: [
        { month: 1, url: '/map/flycam/{z}/{x}/{y}.webp' },
    ],
};
const FLYCAM_YEARS = Object.keys(FLYCAM_DATA).map(Number);

/**
 * Vector layer definitions — individual DWG layers from layers_dwg
 */
const BASE_URL = import.meta.env.BASE_URL || '/';
const CACHE_VERSION = Date.now();

/**
 * DWG vector layers config
 * Each layer has: file, nameKey (i18n), stroke/fill/width, visible, zIndex, type
 */
const VECTOR_LAYERS = {
    vung_lo:    { file: 'vung_lo.geojson',    nameKey: 'map.layer_vung_lo',    stroke: '#22c55e',     fill: 'rgba(34,197,94,0.15)',  width: 2,   visible: true,  zIndex: 11 },
    ranh_gioi:  { file: 'ranh_gioi.geojson',  nameKey: 'map.layer_ranh_gioi',  stroke: '#ff0000',     fill: 'transparent',           width: 3,   visible: true,  zIndex: 12 },
    giao_thong: { file: 'giao_thong.geojson', nameKey: 'map.layer_giao_thong', stroke: '#fbbf24',     fill: 'transparent',           width: 3,   visible: true,  zIndex: 13 },
    thuy_loi:   { file: 'thuy_loi.geojson',   nameKey: 'map.layer_thuy_loi',   stroke: '#22d3ee',     fill: 'transparent',           width: 2,   visible: false, zIndex: 14 },
    trong_trot: { file: 'trong_trot.geojson',  nameKey: 'map.layer_trong_trot', stroke: '#4ade80',     fill: 'rgba(74,222,128,0.15)', width: 1.5, visible: false, zIndex: 15 },
    lo_thua:    { file: 'lo_thua.geojson',    nameKey: 'map.layer_lo_thua',    stroke: '#94a3b8',     fill: 'transparent',           width: 1.5, visible: false, zIndex: 16 },
    labels:     { file: 'labels.geojson',     nameKey: 'map.layer_labels',     stroke: null, fill: null, width: null,                  visible: true,  zIndex: 20, type: 'labels' },
};

const ROAD_GRAPH_URL = `${BASE_URL}data/road_graph.json?v=${CACHE_VERSION}`;

/**
 * Load GeoJSON from file
 */
const loadGeoJSON = async (url) => {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error(`[OpenLayersMap] Failed to load ${url}:`, error);
        return null;
    }
};


/**
 * OpenLayers Map Component
 */
export const OpenLayersMap = ({
    className,
    // eslint-disable-next-line no-unused-vars
    geoJsonData = {},
    onFeatureClick,
    // eslint-disable-next-line no-unused-vars
    onFeatureHover,
    initialCenter,
    initialZoom,
}) => {
    const { t } = useTranslation();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [, setIsMapMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const handler = (e) => setIsMapMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    const [loadError, setLoadError] = useState(null);
    const [activeLayers, setActiveLayers] = useState(() => {
        const state = { google: true, flycam: true };
        Object.entries(VECTOR_LAYERS).forEach(([key, cfg]) => { state[key] = cfg.visible; });
        return state;
    });
    const [, setSelectedFeature] = useState(null);
    const [layerPanelOpen, setLayerPanelOpen] = useState(false);
    const layerPanelRef = useRef(null);

    // GPS tracking state
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [gpsPosition, setGpsPosition] = useState(null); // { lat, lng, heading, speed, accuracy }
    const gpsWatchIdRef = useRef(null);
    const gpsLayerRef = useRef(null);

    // Measure tool state
    const [measureMode, setMeasureMode] = useState(null); // 'distance' | 'area' | null
    const [measureResult, setMeasureResult] = useState(null);
    const measureLayerRef = useRef(null);
    const measureDrawRef = useRef(null);

    // Routing state
    const [routeMode, setRouteMode] = useState(false);
    const [routeStart, setRouteStart] = useState(null); // [lon, lat] in EPSG:4326
    const [routeEnd, setRouteEnd] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null); // { distance, duration }
    const routeLayerRef = useRef(null);
    const routeModeRef = useRef(false);
    const handleRouteClickRef = useRef(null);
    const roadGraphRef = useRef(null);

    // Flycam timeline state - year + month index within that year
    const [flycamYear, setFlycamYear] = useState(FLYCAM_YEARS[FLYCAM_YEARS.length - 1]);
    const [flycamMonthIdx, setFlycamMonthIdx] = useState(() => FLYCAM_DATA[FLYCAM_YEARS[FLYCAM_YEARS.length - 1]].length - 1);
    const [flycamFilterOpen, setFlycamFilterOpen] = useState(false);
    const [flycamPanelOpen, setFlycamPanelOpen] = useState(false);
    const flycamPanelRef = useRef(null);

    /**
     * Initialize map and load vector layers
     * Vector layers loaded inside initMap to avoid React StrictMode timing issues
     */
    useEffect(() => {
        let mounted = true;

        const initMap = async () => {
            try {
                await loadOpenLayers();

                if (!mounted || !mapRef.current) return;

                // Create tile layers
                const tileLayers = Object.entries(TILE_LAYERS).map(([key, config]) => {
                    return new TileLayer({
                        source: new XYZ({
                            url: config.url,
                            crossOrigin: 'anonymous',
                            minZoom: config.minZoom,
                            maxZoom: config.maxZoom,
                        }),
                        visible: activeLayers[key] ?? config.visible,
                        zIndex: config.zIndex,
                        properties: { name: key, displayName: config.name },
                    });
                });

                // Create map
                const map = new OLMap({
                    target: mapRef.current,
                    layers: tileLayers,
                    view: new View({
                        center: fromLonLat(initialCenter || MAP_CONFIG.center),
                        zoom: initialZoom || MAP_CONFIG.zoom,
                        minZoom: MAP_CONFIG.minZoom,
                        maxZoom: MAP_CONFIG.maxZoom,
                    }),
                    controls: [],
                });

                mapInstanceRef.current = map;

                // Throttled pointer move handler for better performance
                let lastMoveTime = 0;
                const THROTTLE_MS = 50;

                map.on('pointermove', (e) => {
                    const now = Date.now();
                    if (now - lastMoveTime < THROTTLE_MS) return;
                    lastMoveTime = now;

                    const feature = map.forEachFeatureAtPixel(e.pixel, f => f, {
                        hitTolerance: 2,
                    });
                    map.getTargetElement().style.cursor = feature ? 'pointer' : '';
                });

                // Add click handler (routing mode intercepts clicks)
                map.on('click', (e) => {
                    if (routeModeRef.current && handleRouteClickRef.current) {
                        handleRouteClickRef.current(e.coordinate);
                        return;
                    }
                    const feature = map.forEachFeatureAtPixel(e.pixel, f => f);
                    if (feature) {
                        setSelectedFeature(feature);
                        onFeatureClick?.(feature.getProperties());
                    }
                });

                // Load individual DWG vector layers in parallel
                const layerEntries = Object.entries(VECTOR_LAYERS);
                const layerPromises = layerEntries.map(([key, cfg]) =>
                    loadGeoJSON(`${BASE_URL}data/layers/${cfg.file}?v=${CACHE_VERSION}`)
                        .then(data => ({ key, cfg, data }))
                );
                // Load road graph for routing
                const graphPromise = loadGeoJSON(ROAD_GRAPH_URL);

                const [layerResults, roadGraph] = await Promise.all([
                    Promise.all(layerPromises),
                    graphPromise,
                ]);

                if (!mounted) return;

                // Create label style function
                const labelsStyleFn = (feature, resolution) => {
                    if (resolution > 20) return null;
                    const text = (feature.get('text') || '').replace(/\{\\f[^;]*;([^}]*)\}/g, '$1').replace(/\\P/g, '\n');
                    const color = feature.get('color') || '#333333';
                    return new Style({
                        text: new Text({
                            text,
                            font: 'bold 13px sans-serif',
                            fill: new Fill({ color: color === '#FFFFFF' ? '#000' : color }),
                            stroke: new Stroke({ color: '#fff', width: 3 }),
                            overflow: true,
                        }),
                    });
                };

                // Add each layer to map
                for (const { key, cfg, data } of layerResults) {
                    if (!data?.features?.length) continue;

                    const source = new VectorSource({
                        features: new GeoJSON().readFeatures(data, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857',
                        }),
                    });

                    const layerOpts = {
                        source,
                        visible: activeLayers[key] ?? cfg.visible,
                        zIndex: cfg.zIndex,
                        properties: { name: key },
                    };

                    if (cfg.type === 'labels') {
                        layerOpts.style = labelsStyleFn;
                        layerOpts.minZoom = 14;
                        layerOpts.declutter = true;
                    } else {
                        layerOpts.style = new Style({
                            stroke: new Stroke({ color: cfg.stroke, width: cfg.width }),
                            fill: new Fill({ color: cfg.fill }),
                        });
                    }

                    map.addLayer(new VectorLayer(layerOpts));
                }

                // Load pre-built road graph for routing
                if (roadGraph) {
                    roadGraphRef.current = loadPrebuiltGraph(roadGraph);
                }

                setIsLoading(false);
            } catch (error) {
                console.error('[OpenLayersMap] Init error:', error);
                setLoadError(error.message);
                setIsLoading(false);
            }
        };

        initMap();

        return () => {
            mounted = false;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.setTarget(null);
                mapInstanceRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Update layer visibility
     */
    const toggleLayer = useCallback((layerName) => {
        setActiveLayers(prev => {
            const newState = { ...prev, [layerName]: !prev[layerName] };

            // Update map layer visibility
            const map = mapInstanceRef.current;
            if (map) {
                map.getLayers().forEach(layer => {
                    if (layer.get('name') === layerName) {
                        layer.setVisible(newState[layerName]);
                    }
                });
            }

            return newState;
        });
    }, []);

    /**
     * Zoom controls
     */
    const handleZoomIn = useCallback(() => {
        const map = mapInstanceRef.current;
        if (map) {
            const view = map.getView();
            view.animate({ zoom: view.getZoom() + 1, duration: 200 });
        }
    }, []);

    const handleZoomOut = useCallback(() => {
        const map = mapInstanceRef.current;
        if (map) {
            const view = map.getView();
            view.animate({ zoom: view.getZoom() - 1, duration: 200 });
        }
    }, []);

    /**
     * Fit to extent
     */
    const handleFitExtent = useCallback(() => {
        const map = mapInstanceRef.current;
        if (map) {
            // Fit to default bounds
            const extent = transformExtent(
                [106.59, 12.2346, 106.68, 12.3],
                'EPSG:4326',
                'EPSG:3857'
            );
            map.getView().fit(extent, { duration: 500, padding: [50, 50, 50, 50] });
        }
    }, []);

    /**
     * Center map on current GPS position (one-shot, no lock)
     */
    const handleCenterOnGps = useCallback(() => {
        if (gpsPosition && mapInstanceRef.current) {
            mapInstanceRef.current.getView().animate({
                center: fromLonLat([gpsPosition.lng, gpsPosition.lat]),
                zoom: 18,
                duration: 500,
            });
        }
    }, [gpsPosition]);

    /**
     * GPS Tracking with heading and speed
     */
    const updateGpsMarker = useCallback((position) => {
        const map = mapInstanceRef.current;
        if (!map || !Point || !Feature) return;

        const coords = fromLonLat([position.lng, position.lat]);

        // Create or update GPS layer
        if (!gpsLayerRef.current) {
            const gpsSource = new VectorSource();
            gpsLayerRef.current = new VectorLayer({
                source: gpsSource,
                zIndex: 100,
                properties: { name: 'gps-tracking' },
            });
            map.addLayer(gpsLayerRef.current);
        }

        const source = gpsLayerRef.current.getSource();
        source.clear();

        // Accuracy circle
        if (position.accuracy) {
            const accuracyFeature = new Feature({
                geometry: new Point(coords),
            });
            accuracyFeature.setStyle(new Style({
                image: new Circle({
                    radius: Math.min(position.accuracy / map.getView().getResolution(), 100),
                    fill: new Fill({ color: 'rgba(59, 130, 246, 0.1)' }),
                    stroke: new Stroke({ color: 'rgba(59, 130, 246, 0.3)', width: 1 }),
                }),
            }));
            source.addFeature(accuracyFeature);
        }

        // Position marker - arrow with heading
        const posFeature = new Feature({
            geometry: new Point(coords),
        });

        const rotation = position.heading != null ? (position.heading * Math.PI) / 180 : 0;
        const hasHeading = position.heading != null;

        // SVG navigation arrow (points up by default, rotated by heading)
        const arrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
            `<filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/></filter>` +
            `<g filter="url(#s)">` +
            (hasHeading
                ? `<polygon points="16,4 24,26 16,20 8,26" fill="#3b82f6" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`
                : `<circle cx="16" cy="16" r="8" fill="#3b82f6" stroke="#fff" stroke-width="3"/>`) +
            `</g></svg>`;
        const arrowUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(arrowSvg);

        posFeature.setStyle(new Style({
            image: new Icon({
                src: arrowUrl,
                scale: 1,
                rotation: hasHeading ? rotation : 0,
                rotateWithView: true,
                anchor: [0.5, 0.5],
            }),
        }));
        source.addFeature(posFeature);
    }, []);

    const gpsFirstFixRef = useRef(false);

    const toggleGpsTracking = useCallback(() => {
        if (!navigator.geolocation) {
            alert(t('map.gps_unavailable'));
            return;
        }

        if (gpsEnabled) {
            // Stop tracking
            if (gpsWatchIdRef.current) {
                navigator.geolocation.clearWatch(gpsWatchIdRef.current);
                gpsWatchIdRef.current = null;
            }
            setGpsEnabled(false);
            setGpsPosition(null);
            gpsFirstFixRef.current = false;
            if (gpsLayerRef.current && mapInstanceRef.current) {
                mapInstanceRef.current.removeLayer(gpsLayerRef.current);
                gpsLayerRef.current = null;
            }
        } else {
            // Start tracking
            setGpsEnabled(true);
            gpsFirstFixRef.current = false;
            gpsWatchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const newPosition = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        heading: pos.coords.heading,
                        speed: pos.coords.speed,
                        accuracy: pos.coords.accuracy,
                    };
                    setGpsPosition(newPosition);
                    updateGpsMarker(newPosition);

                    // Zoom to position only on first fix, then free pan
                    if (!gpsFirstFixRef.current && mapInstanceRef.current) {
                        gpsFirstFixRef.current = true;
                        mapInstanceRef.current.getView().animate({
                            center: fromLonLat([newPosition.lng, newPosition.lat]),
                            zoom: 18,
                            duration: 500,
                        });
                    }
                },
                (error) => {
                    console.warn('GPS error:', error.message);
                    setGpsEnabled(false);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 1000,
                    timeout: 10000,
                }
            );
        }
    }, [gpsEnabled, updateGpsMarker, t]);

    /**
     * Measure tools (distance and area)
     */
    const formatLength = (length) => {
        if (length > 1000) {
            return `${(length / 1000).toFixed(2)} km`;
        }
        return `${length.toFixed(1)} m`;
    };

    const formatArea = (area) => {
        if (area > 10000) {
            return `${(area / 10000).toFixed(2)} ha`;
        }
        return `${area.toFixed(1)} m²`;
    };

    const stopMeasure = useCallback(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (measureDrawRef.current) {
            map.removeInteraction(measureDrawRef.current);
            measureDrawRef.current = null;
        }
        if (measureLayerRef.current) {
            map.removeLayer(measureLayerRef.current);
            measureLayerRef.current = null;
        }
        setMeasureMode(null);
        setMeasureResult(null);
    }, []);

    const startMeasure = useCallback((type) => {
        const map = mapInstanceRef.current;
        if (!map || !Draw) return;

        // Clear previous measure
        stopMeasure();

        setMeasureMode(type);
        setMeasureResult(null);

        // Create measure layer
        const measureSource = new VectorSource();
        measureLayerRef.current = new VectorLayer({
            source: measureSource,
            style: new Style({
                stroke: new Stroke({
                    color: '#f97316',
                    width: 3,
                    lineDash: [10, 10],
                }),
                fill: new Fill({
                    color: 'rgba(249, 115, 22, 0.2)',
                }),
            }),
            zIndex: 99,
        });
        map.addLayer(measureLayerRef.current);

        // Create draw interaction
        const drawType = type === 'distance' ? 'LineString' : 'Polygon';
        measureDrawRef.current = new Draw({
            source: measureSource,
            type: drawType,
            style: new Style({
                stroke: new Stroke({
                    color: '#f97316',
                    width: 2,
                    lineDash: [5, 5],
                }),
                fill: new Fill({
                    color: 'rgba(249, 115, 22, 0.1)',
                }),
                image: new Circle({
                    radius: 5,
                    fill: new Fill({ color: '#f97316' }),
                }),
            }),
        });

        measureDrawRef.current.on('drawend', (e) => {
            const geom = e.feature.getGeometry();
            let result;
            if (type === 'distance') {
                result = formatLength(getLength(geom));
            } else {
                result = formatArea(getArea(geom));
            }
            setMeasureResult(result);
        });

        map.addInteraction(measureDrawRef.current);
    }, [stopMeasure]);

    /**
     * Routing: clear route layer and state
     */
    const clearRoute = useCallback(() => {
        const map = mapInstanceRef.current;
        if (map && routeLayerRef.current) {
            map.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
        }
        setRouteStart(null);
        setRouteEnd(null);
        setRouteInfo(null);
    }, []);

    /**
     * Routing: toggle routing mode on/off
     */
    const toggleRouteMode = useCallback(() => {
        if (routeMode) {
            // Exit routing mode
            setRouteMode(false);
            clearRoute();
        } else {
            // Enter routing mode, stop measure if active
            stopMeasure();
            setRouteMode(true);
            setRouteStart(null);
            setRouteEnd(null);
            setRouteInfo(null);
        }
    }, [routeMode, clearRoute, stopMeasure]);

    /**
     * Routing: draw start/end pin markers, route line with casing, and direction arrows
     */
    const drawRoute = useCallback((start, end, routeGeometry) => {
        const map = mapInstanceRef.current;
        if (!map || !Feature || !Point) return;

        if (routeLayerRef.current) {
            map.removeLayer(routeLayerRef.current);
        }

        const routeSource = new VectorSource();

        // SVG pin marker builder
        const pinSvg = (color) =>
            `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">` +
            `<filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>` +
            `<g filter="url(#s)">` +
            `<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${color}"/>` +
            `<circle cx="14" cy="14" r="5" fill="white"/>` +
            `</g></svg>`;

        // Start pin (green)
        if (start) {
            const f = new Feature({ geometry: new Point(fromLonLat(start)) });
            f.setStyle(new Style({
                image: new Icon({
                    src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pinSvg('#22c55e')),
                    anchor: [0.5, 1],
                    scale: 1.2,
                }),
            }));
            routeSource.addFeature(f);
        }

        // End pin (red)
        if (end) {
            const f = new Feature({ geometry: new Point(fromLonLat(end)) });
            f.setStyle(new Style({
                image: new Icon({
                    src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pinSvg('#ef4444')),
                    anchor: [0.5, 1],
                    scale: 1.2,
                }),
            }));
            routeSource.addFeature(f);
        }

        // Route line with casing + direction arrows
        if (routeGeometry && routeGeometry.coordinates && routeGeometry.coordinates.length >= 2) {
            const routeCoords = routeGeometry.coordinates.map(c => fromLonLat(c));

            // Dark casing (border effect)
            const casing = new Feature({ geometry: new LineString(routeCoords) });
            casing.setStyle(new Style({
                stroke: new Stroke({ color: '#1e3a8a', width: 9 }),
            }));
            routeSource.addFeature(casing);

            // Main bright blue line
            const main = new Feature({ geometry: new LineString(routeCoords) });
            main.setStyle(new Style({
                stroke: new Stroke({ color: '#3b82f6', width: 6 }),
            }));
            routeSource.addFeature(main);

            // Direction arrows along route
            const arrowSvg =
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">` +
                `<polygon points="10,3 16,14 10,10 4,14" fill="white" stroke="#1e3a8a" stroke-width="1.2" stroke-linejoin="round"/>` +
                `</svg>`;
            const arrowUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(arrowSvg);

            // Place ~12-15 arrows evenly along the route
            const n = routeCoords.length;
            const step = Math.max(2, Math.floor(n / 15));

            for (let i = step; i < n - 1; i += step) {
                const prev = routeCoords[i - 1];
                const curr = routeCoords[i];
                const dx = curr[0] - prev[0];
                const dy = curr[1] - prev[1];
                // Bearing: atan2(east, north) = clockwise from north
                const rotation = Math.atan2(dx, dy);

                const arrow = new Feature({ geometry: new Point(curr) });
                arrow.setStyle(new Style({
                    image: new Icon({
                        src: arrowUrl,
                        rotation,
                        rotateWithView: true,
                        anchor: [0.5, 0.5],
                        scale: 1,
                    }),
                }));
                routeSource.addFeature(arrow);
            }
        }

        routeLayerRef.current = new VectorLayer({
            source: routeSource,
            zIndex: 50,
            properties: { name: 'route' },
        });
        map.addLayer(routeLayerRef.current);
    }, []);

    /**
     * Routing: find route using client-side Dijkstra on DWG road network
     */
    const fetchRoute = useCallback((start, end) => {
        const graph = roadGraphRef.current;
        if (!graph?.nodes?.length) {
            setRouteInfo({ error: true });
            drawRoute(start, end, null);
            return;
        }

        const startNode = findNearestNode(graph, start);
        const endNode = findNearestNode(graph, end);

        if (startNode === null || endNode === null) {
            setRouteInfo({ error: true });
            drawRoute(start, end, null);
            return;
        }

        const result = dijkstra(graph, startNode, endNode);
        if (!result) {
            setRouteInfo({ error: true });
            drawRoute(start, end, null);
            return;
        }

        // Format distance
        let distStr;
        if (result.distance > 1000) {
            distStr = `${(result.distance / 1000).toFixed(1)} km`;
        } else {
            distStr = `${Math.round(result.distance)} m`;
        }

        // Format duration (based on 20 km/h road speed)
        let durStr;
        if (result.duration > 3600) {
            const h = Math.floor(result.duration / 3600);
            const m = Math.round((result.duration % 3600) / 60);
            durStr = `${h}h ${m}m`;
        } else {
            durStr = `${Math.round(result.duration / 60)} min`;
        }

        setRouteInfo({ distance: distStr, duration: durStr });
        drawRoute(start, end, { type: 'LineString', coordinates: result.path });

        // Fit map to route bounds
        const map = mapInstanceRef.current;
        if (map && routeLayerRef.current) {
            const extent = routeLayerRef.current.getSource().getExtent();
            map.getView().fit(extent, { duration: 500, padding: [60, 60, 60, 60] });
        }
    }, [drawRoute]);

    /**
     * Routing: snap click to nearest road node, then set start/end
     */
    const handleRouteClick = useCallback((coordinate) => {
        const lonLat = toLonLat(coordinate);
        const graph = roadGraphRef.current;

        // Snap to nearest road node
        let snapped = lonLat;
        if (graph?.nodes?.length) {
            const nodeIdx = findNearestNode(graph, lonLat);
            if (nodeIdx !== null) {
                snapped = graph.nodes[nodeIdx];
            } else {
                return; // Too far from any road
            }
        }

        if (!routeStart) {
            setRouteStart(snapped);
            setRouteEnd(null);
            setRouteInfo(null);
            drawRoute(snapped, null, null);
        } else if (!routeEnd) {
            setRouteEnd(snapped);
            drawRoute(routeStart, snapped, null);
            fetchRoute(routeStart, snapped);
        } else {
            setRouteStart(snapped);
            setRouteEnd(null);
            setRouteInfo(null);
            drawRoute(snapped, null, null);
        }
    }, [routeStart, routeEnd, drawRoute, fetchRoute]);

    /**
     * Routing: use current GPS position as start point
     */
    const useGpsAsStart = useCallback(() => {
        if (!gpsPosition) return;
        const lonLat = [gpsPosition.lng, gpsPosition.lat];
        const graph = roadGraphRef.current;
        let snapped = lonLat;
        if (graph?.nodes?.length) {
            const nodeIdx = findNearestNode(graph, lonLat);
            if (nodeIdx !== null) snapped = graph.nodes[nodeIdx];
        }
        setRouteStart(snapped);
        setRouteEnd(null);
        setRouteInfo(null);
        drawRoute(snapped, null, null);
    }, [gpsPosition, drawRoute]);

    // Keep routing refs in sync with state for use inside map click handler
    useEffect(() => {
        routeModeRef.current = routeMode;
    }, [routeMode]);
    useEffect(() => {
        handleRouteClickRef.current = handleRouteClick;
    }, [handleRouteClick]);

    /**
     * Switch flycam tile source when year/month changes
     */
    const updateFlycamSource = useCallback((url) => {
        const map = mapInstanceRef.current;
        if (!map) return;
        map.getLayers().forEach(layer => {
            if (layer.get('name') === 'flycam') {
                layer.getSource().setUrl(url);
            }
        });
    }, []);

    const handleFlycamYearChange = useCallback((year) => {
        setFlycamYear(year);
        const months = FLYCAM_DATA[year];
        const lastIdx = months.length - 1;
        setFlycamMonthIdx(lastIdx);
        updateFlycamSource(months[lastIdx].url);
    }, [updateFlycamSource]);

    const handleFlycamMonthSelect = useCallback((idx) => {
        setFlycamMonthIdx(idx);
        const entry = FLYCAM_DATA[flycamYear]?.[idx];
        if (entry) updateFlycamSource(entry.url);
    }, [flycamYear, updateFlycamSource]);

    // Compute flat index for slider (across all years)
    const flycamFlatEntries = useMemo(() => {
        const entries = [];
        for (const y of FLYCAM_YEARS) {
            for (const m of FLYCAM_DATA[y]) {
                entries.push({ year: y, ...m });
            }
        }
        return entries;
    }, []);

    const flycamSliderValue = useMemo(() => {
        let idx = 0;
        for (const y of FLYCAM_YEARS) {
            if (y === flycamYear) return idx + flycamMonthIdx;
            idx += FLYCAM_DATA[y].length;
        }
        return 0;
    }, [flycamYear, flycamMonthIdx]);

    const handleFlycamSliderChange = useCallback((flatIdx) => {
        const entry = flycamFlatEntries[flatIdx];
        if (!entry) return;
        setFlycamYear(entry.year);
        // Find month index within that year
        const months = FLYCAM_DATA[entry.year];
        const mIdx = months.findIndex(m => m.month === entry.month);
        setFlycamMonthIdx(mIdx >= 0 ? mIdx : 0);
        updateFlycamSource(entry.url);
    }, [flycamFlatEntries, updateFlycamSource]);

    // Cleanup GPS and route on unmount
    useEffect(() => {
        return () => {
            if (gpsWatchIdRef.current) {
                navigator.geolocation.clearWatch(gpsWatchIdRef.current);
            }
        };
    }, []);

    // Close layer panel on click outside
    useEffect(() => {
        if (!layerPanelOpen) return;
        const handleClickOutside = (e) => {
            if (layerPanelRef.current && !layerPanelRef.current.contains(e.target)) {
                setLayerPanelOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [layerPanelOpen]);

    // Close flycam panel on click outside (mobile)
    useEffect(() => {
        if (!flycamPanelOpen) return;
        const handleClickOutside = (e) => {
            if (flycamPanelRef.current && !flycamPanelRef.current.contains(e.target)) {
                setFlycamPanelOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [flycamPanelOpen]);

    if (loadError) {
        return (
            <div className={cn("flex items-center justify-center bg-destructive/10 rounded-lg", className)}>
                <p className="text-destructive">{t('map.load_error')}: {loadError}</p>
            </div>
        );
    }

    return (
        <div className={cn("relative overflow-hidden rounded-lg", className)}>
            {/* Map container */}
            <div ref={mapRef} className="w-full h-full" />

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {/* Controls - right side, touch-friendly 44px targets */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                <button
                    onClick={handleZoomIn}
                    className="p-2.5 bg-card border border-border rounded-lg shadow-sm hover:bg-accent"
                    title="Zoom in"
                >
                    <ZoomIn className="h-5 w-5" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-2.5 bg-card border border-border rounded-lg shadow-sm hover:bg-accent"
                    title="Zoom out"
                >
                    <ZoomOut className="h-5 w-5" />
                </button>
                <button
                    onClick={handleFitExtent}
                    className="p-2.5 bg-card border border-border rounded-lg shadow-sm hover:bg-accent"
                    title={t('map.fit_extent')}
                >
                    <Maximize2 className="h-5 w-5" />
                </button>

                {/* GPS: toggle tracking. If already on, tap again = center on me */}
                <button
                    onClick={gpsEnabled ? handleCenterOnGps : toggleGpsTracking}
                    onDoubleClick={gpsEnabled ? toggleGpsTracking : undefined}
                    className={cn(
                        "p-2.5 border rounded-lg shadow-sm",
                        gpsEnabled
                            ? "bg-blue-500 border-blue-600 text-white"
                            : "bg-card border-border hover:bg-accent"
                    )}
                    title={gpsEnabled ? t('map.gps_center_hint') : t('map.gps_enable')}
                >
                    <Navigation className="h-5 w-5" />
                </button>

                {/* Measure Distance */}
                <button
                    onClick={() => measureMode === 'distance' ? stopMeasure() : startMeasure('distance')}
                    className={cn(
                        "p-2.5 border rounded-lg shadow-sm",
                        measureMode === 'distance'
                            ? "bg-green-600 border-green-700 text-white"
                            : "bg-card border-border hover:bg-accent"
                    )}
                    title={t('map.measure_distance')}
                >
                    <Ruler className="h-5 w-5" />
                </button>

                {/* Measure Area */}
                <button
                    onClick={() => measureMode === 'area' ? stopMeasure() : startMeasure('area')}
                    className={cn(
                        "p-2.5 border rounded-lg shadow-sm",
                        measureMode === 'area'
                            ? "bg-green-600 border-green-700 text-white"
                            : "bg-card border-border hover:bg-accent"
                    )}
                    title={t('map.measure_area')}
                >
                    <Square className="h-5 w-5" />
                </button>

                {/* Routing / Directions */}
                <button
                    onClick={toggleRouteMode}
                    className={cn(
                        "p-2.5 border rounded-lg shadow-sm",
                        routeMode
                            ? "bg-blue-500 border-blue-600 text-white"
                            : "bg-card border-border hover:bg-accent"
                    )}
                    title={t('map.route')}
                >
                    <Route className="h-5 w-5" />
                </button>
            </div>

            {/* Top-left info panels - GPS, measure, route, below MapPage header */}
            {((gpsEnabled && gpsPosition) || measureMode || routeMode) && (
                <div className="absolute top-16 left-4 z-20 flex flex-col gap-2">
                    {/* GPS info */}
                    {gpsEnabled && gpsPosition && (
                        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-2.5 py-1.5 flex flex-col gap-0.5 text-xs">
                            <div className="flex items-center gap-2">
                                <Navigation className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="font-mono whitespace-nowrap">{gpsPosition.lat.toFixed(4)}, {gpsPosition.lng.toFixed(4)}</span>
                                <button
                                    onClick={toggleGpsTracking}
                                    className="p-0.5 text-muted-foreground hover:text-foreground ml-auto shrink-0"
                                    title={t('map.gps_disable')}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground font-mono pl-5.5">
                                {gpsPosition.heading != null && (
                                    <span className="text-emerald-400">{gpsPosition.heading.toFixed(0)}°</span>
                                )}
                                {gpsPosition.speed != null && gpsPosition.speed > 0 && (
                                    <span className="text-emerald-500">{(gpsPosition.speed * 3.6).toFixed(0)} km/h</span>
                                )}
                                <span>±{gpsPosition.accuracy?.toFixed(0) || '?'}m</span>
                            </div>
                        </div>
                    )}

                    {/* Measure info */}
                    {measureMode && (
                        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-2.5 py-1.5 flex items-center gap-2 text-xs">
                            {measureMode === 'distance' ? (
                                <Ruler className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            ) : (
                                <Square className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            )}
                            {measureResult ? (
                                <span className="font-bold text-green-500 text-sm whitespace-nowrap">{measureResult}</span>
                            ) : (
                                <span className="text-muted-foreground whitespace-nowrap">{t('map.measure_draw_hint')}</span>
                            )}
                            <button
                                onClick={stopMeasure}
                                className="p-0.5 text-muted-foreground hover:text-foreground ml-auto shrink-0"
                                title={t('map.measure_cancel')}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Route info */}
                    {routeMode && (
                        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-2.5 py-1.5 flex flex-col gap-1 text-xs max-w-[260px]">
                            <div className="flex items-center gap-2">
                                <Route className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                {routeInfo?.error ? (
                                    <span className="text-red-500 whitespace-nowrap">{t('map.route_no_result')}</span>
                                ) : routeInfo ? (
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-blue-500 text-sm whitespace-nowrap">{routeInfo.distance}</span>
                                        <span className="text-muted-foreground whitespace-nowrap">{routeInfo.duration}</span>
                                    </div>
                                ) : !routeStart ? (
                                    <span className="text-muted-foreground whitespace-nowrap">{t('map.route_click_start')}</span>
                                ) : (
                                    <span className="text-muted-foreground whitespace-nowrap">{t('map.route_click_end')}</span>
                                )}
                                <button
                                    onClick={toggleRouteMode}
                                    className="p-0.5 text-muted-foreground hover:text-foreground ml-auto shrink-0"
                                    title={t('map.route_clear')}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {/* Use GPS as start button */}
                            {gpsEnabled && gpsPosition && !routeEnd && (
                                <button
                                    onClick={useGpsAsStart}
                                    className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 pl-5.5"
                                >
                                    <Navigation className="h-3 w-3" />
                                    <span className="whitespace-nowrap">{t('map.route_use_gps')}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Flycam timeline - bottom center, collapsible filter + always-visible slider */}
            {activeLayers.flycam && (
                <div className="absolute bottom-3 left-14 right-14 z-20 pointer-events-none flex justify-center">
                    <div className="pointer-events-auto bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-sm max-w-sm w-full overflow-hidden">
                        {/* Collapsible filter: year tabs + month thumbnails */}
                        {flycamFilterOpen && (
                            <div className="px-3 pt-2 pb-1">
                                <div className="flex items-center gap-1 mb-2">
                                    {FLYCAM_YEARS.map(y => (
                                        <button
                                            key={y}
                                            onClick={() => handleFlycamYearChange(y)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                                y === flycamYear
                                                    ? "bg-blue-500 text-white"
                                                    : "text-muted-foreground hover:bg-accent"
                                            )}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {FLYCAM_DATA[flycamYear]?.map((entry, i) => (
                                        <button
                                            key={entry.month}
                                            onClick={() => handleFlycamMonthSelect(i)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                                i === flycamMonthIdx
                                                    ? "bg-blue-500 text-white"
                                                    : "text-muted-foreground hover:bg-accent"
                                            )}
                                        >
                                            T{entry.month}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Always visible: toggle arrow + current label + slider — h-[44px] to match Layer button */}
                        <div className="px-2 h-[44px] flex items-center gap-1">
                            <button
                                onClick={() => setFlycamFilterOpen(prev => !prev)}
                                className="p-0.5 rounded hover:bg-accent shrink-0 transition-colors"
                                title={flycamFilterOpen ? t('map.hide_filter') : t('map.select_date')}
                            >
                                {flycamFilterOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                            </button>
                            <span className="text-[10px] font-medium text-emerald-500 whitespace-nowrap shrink-0">
                                T{FLYCAM_DATA[flycamYear]?.[flycamMonthIdx]?.month}/{String(flycamYear).slice(2)}
                            </span>
                            <input
                                type="range"
                                min={0}
                                max={flycamFlatEntries.length - 1}
                                value={flycamSliderValue}
                                onChange={(e) => handleFlycamSliderChange(Number(e.target.value))}
                                className="flex-1 h-1 accent-blue-500 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Layer toggle - bottom left, panel opens upward */}
            <div ref={layerPanelRef} className="absolute bottom-3 left-2 z-20 flex flex-col-reverse items-start gap-2">
                <button
                    onClick={() => setLayerPanelOpen(prev => !prev)}
                    className={cn(
                        "p-2.5 border rounded-lg shadow-sm",
                        layerPanelOpen
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-card border-border hover:bg-accent"
                    )}
                    title={layerPanelOpen ? t('map.hide_layers') : t('map.show_layers')}
                >
                    <Layers className="h-5 w-5" />
                </button>

                {layerPanelOpen && (
                    <div className="bg-card border border-border rounded-lg shadow-lg p-3 max-h-[50vh] overflow-y-auto min-w-[160px]">
                        {/* Tile Layers */}
                        <div className="mb-3">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 px-1">{t('map.layer_base')}</div>
                            <div className="space-y-1 text-xs">
                                {Object.entries(TILE_LAYERS).map(([key, config]) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded px-2 py-1">
                                        <input
                                            type="checkbox"
                                            checked={activeLayers[key] ?? config.visible}
                                            onChange={() => toggleLayer(key)}
                                            className="rounded"
                                        />
                                        <span>{config.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* DWG Vector Layers */}
                        <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 px-1">{t('map.layer_dwg')}</div>
                            <div className="space-y-0.5 text-xs">
                                {Object.entries(VECTOR_LAYERS).map(([key, cfg]) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded px-2 py-1">
                                        <input
                                            type="checkbox"
                                            checked={activeLayers[key] ?? cfg.visible}
                                            onChange={() => toggleLayer(key)}
                                            className="rounded"
                                        />
                                        <span className="flex items-center gap-2">
                                            {cfg.type === 'labels' ? (
                                                <span className="w-3 h-3 rounded-full bg-emerald-600 text-[8px] text-white flex items-center justify-center font-bold">A</span>
                                            ) : (
                                                <span className="w-3 h-0.5 rounded" style={{ backgroundColor: cfg.stroke }} />
                                            )}
                                            {t(cfg.nameKey)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Feature info popup - DISABLED */}
            {/* {selectedFeature && (
                <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-20">
                    <div className="bg-card border border-border rounded-lg shadow-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">Feature Info</h4>
                            <button
                                onClick={() => setSelectedFeature(null)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                ×
                            </button>
                        </div>
                        <div className="text-sm space-y-1">
                            {Object.entries(selectedFeature.getProperties())
                                .filter(([k]) => k !== 'geometry')
                                .map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                        <span className="text-muted-foreground">{key}:</span>
                                        <span className="font-mono">{String(value)}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    );
};

export default OpenLayersMap;
