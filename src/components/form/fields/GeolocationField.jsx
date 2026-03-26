import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { MapPin } from 'lucide-react';
import { cn } from '../../../lib/utils';

/**
 * Geolocation field for Geolocation fieldtype
 *
 * Basic implementation with latitude and longitude text inputs.
 * ERPNext stores geolocation as a JSON string:
 *   { "type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": { "type": "Point", "coordinates": [lng, lat] } }] }
 *
 * For simplicity, this component allows entering lat/lng and stores as the GeoJSON format.
 */
export function GeolocationField({ field, value, onChange, disabled, error }) {
    const isDisabled = disabled || field.read_only === 1;

    // Parse the stored GeoJSON value
    const { lat, lng } = useMemo(() => {
        if (!value) return { lat: '', lng: '' };
        try {
            const geo = typeof value === 'string' ? JSON.parse(value) : value;
            const coords = geo?.features?.[0]?.geometry?.coordinates;
            if (coords && coords.length >= 2) {
                return { lat: String(coords[1]), lng: String(coords[0]) };
            }
        } catch {
            // If parsing fails, try treating as simple "lat,lng" string
            const parts = String(value).split(',');
            if (parts.length === 2) {
                return { lat: parts[0].trim(), lng: parts[1].trim() };
            }
        }
        return { lat: '', lng: '' };
    }, [value]);

    const buildGeoJSON = useCallback((latitude, longitude) => {
        const latNum = parseFloat(latitude);
        const lngNum = parseFloat(longitude);
        if (isNaN(latNum) && isNaN(lngNum)) {
            onChange(field.fieldname, null);
            return;
        }
        const geoJSON = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [isNaN(lngNum) ? 0 : lngNum, isNaN(latNum) ? 0 : latNum],
                },
                properties: {},
            }],
        };
        onChange(field.fieldname, JSON.stringify(geoJSON));
    }, [field.fieldname, onChange]);

    const handleLatChange = useCallback((e) => {
        buildGeoJSON(e.target.value, lng);
    }, [buildGeoJSON, lng]);

    const handleLngChange = useCallback((e) => {
        buildGeoJSON(lat, e.target.value);
    }, [buildGeoJSON, lat]);

    const inputClass = cn(
        "flex h-10 w-full rounded-[6px] border-0 bg-muted px-3 py-1.5 text-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
        error && "ring-1 ring-destructive"
    );

    return (
        <div className="w-full">
            {field.label && (
                <label
                    className="block text-[13px] font-medium text-muted-foreground mb-1.5"
                >
                    <MapPin className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                </label>
            )}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label
                        htmlFor={`${field.fieldname}-lat`}
                        className="block text-[10px] text-muted-foreground mb-0.5"
                    >
                        Latitude
                    </label>
                    <input
                        type="number"
                        id={`${field.fieldname}-lat`}
                        value={lat}
                        onChange={handleLatChange}
                        disabled={isDisabled}
                        placeholder="0.000000"
                        step="any"
                        min="-90"
                        max="90"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label
                        htmlFor={`${field.fieldname}-lng`}
                        className="block text-[10px] text-muted-foreground mb-0.5"
                    >
                        Longitude
                    </label>
                    <input
                        type="number"
                        id={`${field.fieldname}-lng`}
                        value={lng}
                        onChange={handleLngChange}
                        disabled={isDisabled}
                        placeholder="0.000000"
                        step="any"
                        min="-180"
                        max="180"
                        className={inputClass}
                    />
                </div>
            </div>
            {error && (
                <p className="mt-1.5 text-xs text-destructive font-medium">{error}</p>
            )}
            {field.description && !error && (
                <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
        </div>
    );
}

GeolocationField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        description: PropTypes.string,
    }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
};

export default GeolocationField;
