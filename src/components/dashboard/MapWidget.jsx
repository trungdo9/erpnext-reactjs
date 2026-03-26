/**
 * MapWidget - Lightweight map component for Dashboard
 *
 * Optimized for performance:
 * - Lazy load OpenLayers only when visible
 * - Reduced features count
 * - No WebGL (simpler rendering)
 * - Debounced interactions
 * - Simplified styles
 */

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { MapIcon, Maximize2, Layers } from 'lucide-react';
import { useMapSidebar } from '../map';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';

// Lazy load OpenLayers modules (use different names to avoid conflicts)
let OLMap, OLView, TileLayer, VectorLayer, XYZ, VectorSource, GeoJSON, Style, Stroke, Fill;
let fromLonLat;
let olLoaded = false;

const loadOpenLayers = async () => {
    if (olLoaded) return;

    const [
        olMap, olView, olTileLayer, olVectorLayer,
        olXYZ, olVectorSource, olGeoJSON, olStyle, olProj
    ] = await Promise.all([
        import('ol/Map').then(m => m.default),
        import('ol/View').then(m => m.default),
        import('ol/layer/Tile').then(m => m.default),
        import('ol/layer/Vector').then(m => m.default),
        import('ol/source/XYZ').then(m => m.default),
        import('ol/source/Vector').then(m => m.default),
        import('ol/format/GeoJSON').then(m => m.default),
        import('ol/style'),
        import('ol/proj'),
    ]);

    OLMap = olMap;
    OLView = olView;
    TileLayer = olTileLayer;
    VectorLayer = olVectorLayer;
    XYZ = olXYZ;
    VectorSource = olVectorSource;
    GeoJSON = olGeoJSON;
    Style = olStyle.Style;
    Stroke = olStyle.Stroke;
    Fill = olStyle.Fill;
    fromLonLat = olProj.fromLonLat;
    olLoaded = true;
};

// Simplified vector layer config (only load 2 main layers)
const VECTOR_LAYERS = {
    lo: {
        name: 'Ranh Lô',
        file: '/data/Ranhl_2.js',
        varName: 'json_Ranhl_2',
        stroke: '#f97316',
        width: 1.5,
        zIndex: 2,
    },
    doi: {
        name: 'Ranh Đội',
        file: '/data/Ranhi_4.js',
        varName: 'json_Ranhi_4',
        stroke: '#3b82f6',
        width: 2,
        zIndex: 1,
    },
};

// Load GeoJSON from JS file
const loadGeoJSONFromJS = async (url, varName) => {
    try {
        const response = await fetch(url);
        const text = await response.text();
        const regex = new RegExp(`var\\s+${varName}\\s*=\\s*(\\{[\\s\\S]*\\});?`);
        const match = text.match(regex);
        if (match) return JSON.parse(match[1]);
        return JSON.parse(text);
    } catch (error) {
        console.error(`[MapWidget] Failed to load ${url}:`, error);
        return null;
    }
};

// Style cache
const styleCache = new Map();
const getCachedStyle = (config) => {
    if (!styleCache.has(config.stroke)) {
        styleCache.set(config.stroke, new Style({
            stroke: new Stroke({ color: config.stroke, width: config.width }),
            fill: new Fill({ color: 'transparent' }),
        }));
    }
    return styleCache.get(config.stroke);
};

/**
 * MapWidget Component
 */
const MapWidget = memo(({ className }) => {
    const { open: openMapSidebar } = useMapSidebar();
    const { t } = useTranslation();
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const [activeLayer, setActiveLayer] = useState('lo');

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (mapRef.current) {
            observer.observe(mapRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Initialize map when visible
    useEffect(() => {
        if (!isVisible) return;

        let mounted = true;

        const initMap = async () => {
            try {
                await loadOpenLayers();
                if (!mounted || !mapRef.current) return;

                // Create map with minimal config
                const map = new OLMap({
                    target: mapRef.current,
                    layers: [
                        new TileLayer({
                            source: new XYZ({
                                url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
                                crossOrigin: 'anonymous',
                            }),
                            zIndex: 0,
                        }),
                    ],
                    view: new OLView({
                        center: fromLonLat([106.645, 12.212]),
                        zoom: 14,
                        minZoom: 12,
                        maxZoom: 18,
                    }),
                    controls: [],
                    interactions: [], // Disable all interactions initially
                });

                mapInstanceRef.current = map;

                // Enable basic interactions after load
                import('ol/interaction/defaults').then(({ defaults }) => {
                    if (mapInstanceRef.current) {
                        defaults().forEach(i => mapInstanceRef.current.addInteraction(i));
                    }
                });

                // Load active vector layer
                await loadVectorLayer(map, activeLayer);

                setIsLoading(false);
            } catch (error) {
                console.error('[MapWidget] Init error:', error);
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
    }, [isVisible]);

    // Load vector layer
    const loadVectorLayer = useCallback(async (map, layerKey) => {
        const config = VECTOR_LAYERS[layerKey];
        if (!config) return;

        // Remove existing vector layers
        map.getLayers().getArray()
            .filter(l => l.get('isVector'))
            .forEach(l => map.removeLayer(l));

        const data = await loadGeoJSONFromJS(config.file, config.varName);
        if (!data) return;

        // Simplify: only load first 500 features for dashboard
        const features = data.features?.slice(0, 500) || [];
        const simplifiedData = { ...data, features };

        const vectorLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(simplifiedData, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857',
                }),
            }),
            style: getCachedStyle(config),
            zIndex: config.zIndex,
            properties: { isVector: true, name: layerKey },
            updateWhileAnimating: false,
            updateWhileInteracting: false,
        });

        map.addLayer(vectorLayer);
    }, []);

    // Toggle layer
    const toggleLayer = useCallback(() => {
        const newLayer = activeLayer === 'lo' ? 'doi' : 'lo';
        setActiveLayer(newLayer);
        if (mapInstanceRef.current) {
            loadVectorLayer(mapInstanceRef.current, newLayer);
        }
    }, [activeLayer, loadVectorLayer]);

    // Open map sidebar
    const openFullMap = useCallback(() => {
        openMapSidebar();
    }, [openMapSidebar]);

    return (
        <div className={cn(
            "relative overflow-hidden rounded-lg border border-border bg-card",
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                    <MapIcon className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">{t('map.title')}</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleLayer}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors"
                        title={`${t('map.showing')}: ${VECTOR_LAYERS[activeLayer].name}`}
                    >
                        <Layers className="h-4 w-4" />
                    </button>
                    <button
                        onClick={openFullMap}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors"
                        title={t('map.open_full_map')}
                    >
                        <Maximize2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div ref={mapRef} className="h-64 lg:h-80 relative">
                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-muted-foreground">{t('map.loading')}</span>
                        </div>
                    </div>
                )}

                {/* Layer indicator */}
                {!isLoading && (
                    <div className="absolute bottom-2 left-2 z-10">
                        <span className="text-xs px-2 py-1 rounded-full bg-card/90 border border-border shadow-sm">
                            {VECTOR_LAYERS[activeLayer].name}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
});

MapWidget.displayName = 'MapWidget';

export default MapWidget;
