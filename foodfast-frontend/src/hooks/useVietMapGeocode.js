import { useState } from 'react';
import axios from 'axios';

/**
 * Custom hook to fetch geocoding data from VietMap API
 * @returns {object} - { data, loading, error, refetch }
 */
const useVietMapGeocode = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isFetched, setIsFetched] = useState(false);
    const [error, setError] = useState(null);

    const apiKey = import.meta.env.VITE_VIETMAP_KEY;

    const fetchGeocode = async (address) => {
        if (!address || !address.trim()) {
            setData(null);
            setError(null);
            return;
        }

        if (!apiKey) {
            setError('VietMap API key is not configured');
            return;
        }

        setLoading(true);
        setIsFetched(false);
        setError(null);

        try {
            const response = await axios.get('https://maps.vietmap.vn/api/search/v4', {
                params: {
                    apikey: apiKey,
                    text: address,
                    display_type: 2
                }
            });

            const results = response.data;
            const firstResult = results && results.length > 0 ? results[0] : null;
            const refId = firstResult ? firstResult.ref_id : null;
            if (refId) {
                const place = await axios.get('https://maps.vietmap.vn/api/place/v4', {
                params: {
                    apikey: apiKey,
                    refid: refId}
                });
                
                console.log(place);
                
                setData(place.data);
            }
        } catch (err) {
            console.error('VietMap Geocode Error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to fetch geocode data');
        } finally {
            setLoading(false);
            setIsFetched(true);
        }
    };

    const refetch = (address) => {
        fetchGeocode(address);
    };
    
    return { data, loading, error, refetch, isFetched };
};

export default useVietMapGeocode;
