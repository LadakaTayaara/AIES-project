import { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import axios from 'axios';
import { theme } from '../themes';
import { ShieldAlert, AlertTriangle, AlertCircle } from 'lucide-react-native';

const BACKEND_URL = 'http://192.168.1.9:8000/api/heatmap/data';

// Standard dark theme Google Maps style
// Realistically, we'd use Mapbox, but react-native-maps with custom styling is faster for prototype
const mapDarkMode = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#212121" }]
    },
    {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#212121" }]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "administrative.country",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#bdbdbd" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#181818" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#1b1b1b" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [{ "color": "#2c2c2c" }]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#8a8a8a" }]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [{ "color": "#373737" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#3c3c3c" }]
    },
    {
        "featureType": "road.highway.controlled_access",
        "elementType": "geometry",
        "stylers": [{ "color": "#4e4e4e" }]
    },
    {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "featureType": "transit",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#000000" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#3d3d3d" }]
    }
];

// Initial placeholder region for Pune, India (matching backend hints)
export default function DashboardScreen() {
    const [potholes, setPotholes] = useState([]);
    const [healthIndex, setHealthIndex] = useState(72); // Default

    useEffect(() => {
        const fetchHeatmapData = async () => {
            try {
                // We'll hit the newly discovered endpoint to get live hotspot GPS coordinates
                const response = await axios.get(BACKEND_URL);
                if (response.data && response.data.hotspots) {
                    setPotholes(response.data.hotspots);
                }
            } catch (error) {
                console.error("Failed to fetch live heatmap data. Using fallback data.", error);

                // Fallback dummy data if backend endpoint isn't wired to DB yet
                setPotholes([
                    { id: '1', coordinate: { latitude: 18.5204, longitude: 73.8567 }, severity: 'Critical' }, // Pune
                    { id: '2', coordinate: { latitude: 18.5224, longitude: 73.8587 }, severity: 'Medium' },
                    { id: '3', coordinate: { latitude: 18.5184, longitude: 73.8547 }, severity: 'Low' },
                ]);
            }
        };

        fetchHeatmapData();
    }, []);

    const initialRegion = {
        latitude: 18.5204, // Centered on Pune region
        longitude: 73.8567,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    const getMarkerColor = (severity) => {
        switch (severity) {
            case 'Critical': return theme.colors.critical;
            case 'Medium': return theme.colors.warning;
            case 'Low': return theme.colors.success;
            default: return theme.colors.primary;
        }
    };

    const getMarkerIcon = (severity, color) => {
        switch (severity) {
            case 'Critical': return <ShieldAlert color={color} size={24} />;
            case 'Medium': return <AlertTriangle color={color} size={20} />;
            case 'Low': return <AlertCircle color={color} size={16} />;
            default: return <AlertCircle color={color} size={16} />;
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>ROAD HEALTH INDEX</Text>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>{healthIndex}</Text>
                    <Text style={styles.scoreSub}>/ 100</Text>
                </View>
            </View>

            <MapView
                style={styles.map}
                customMapStyle={mapDarkMode}
                initialRegion={initialRegion}
                showsUserLocation={true}
            >
                {potholes.map((pothole, index) => {
                    const color = getMarkerColor(pothole.severity);
                    return (
                        <View key={pothole.id || index.toString()}>
                            <Marker coordinate={pothole.coordinate}>
                                <View style={[styles.markerContainer, { borderColor: color }]}>
                                    {getMarkerIcon(pothole.severity, color)}
                                </View>
                            </Marker>
                            <Circle
                                center={pothole.coordinate}
                                radius={pothole.severity === 'Critical' ? 150 : 80}
                                fillColor={color + '33'} // Add 33 for 20% opacity hex
                                strokeColor={color + '80'} // Add 80 for 50% opacity hex
                                strokeWidth={1}
                            />
                        </View>
                    );
                })}
            </MapView>

            <View style={styles.legendPanel}>
                <Text style={styles.legendTitle}>URBAN PULSE STATUS</Text>
                <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.critical }]} />
                    <Text style={styles.legendText}>CRITICAL DEGRADATION</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.warning }]} />
                    <Text style={styles.legendText}>MODERATE WEAR</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
                    <Text style={styles.legendText}>VERIFIED CLEAR</Text>
                </View>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.background,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 240, 255, 0.2)',
    },
    headerTitle: {
        ...theme.typography.subheading,
        color: theme.colors.textDim,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    scoreText: {
        ...theme.typography.stats,
        color: theme.colors.warning, // 72 is moderate
    },
    scoreSub: {
        ...theme.typography.body,
        color: theme.colors.textDim,
        marginLeft: 4,
    },
    map: {
        flex: 1,
    },
    markerContainer: {
        backgroundColor: 'rgba(10, 10, 10, 0.9)',
        borderRadius: 20,
        padding: 4,
        borderWidth: 1,
    },
    legendPanel: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: theme.effects.glassmorphism.backgroundColor,
        borderWidth: theme.effects.glassmorphism.borderWidth,
        borderColor: theme.effects.glassmorphism.borderColor,
        borderRadius: theme.effects.glassmorphism.borderRadius,
        padding: 15,
    },
    legendTitle: {
        ...theme.typography.body,
        color: theme.colors.primary,
        fontWeight: 'bold',
        marginBottom: 10,
        letterSpacing: 1,
        fontSize: 12,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 5,
    },
    legendText: {
        ...theme.typography.body,
        fontSize: 12,
        color: theme.colors.textDim,
    }
});
