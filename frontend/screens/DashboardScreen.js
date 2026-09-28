import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import { theme } from '../themes';
import { Activity } from 'lucide-react-native';
import Constants from 'expo-constants';

// ── Dynamic backend URL ──────────────────────────────────
function getBackendUrl() {
    const debuggerHost = Constants.expoConfig?.hostUri
        || Constants.manifest?.debuggerHost
        || Constants.manifest2?.extra?.expoGo?.debuggerHost;

    if (debuggerHost) {
        const host = debuggerHost.split(':')[0];
        return `http://${host}:8000`;
    }
    return 'http://192.168.1.9:8000';
}

const BACKEND_URL = getBackendUrl();

export default function DashboardScreen() {
    const [potholes, setPotholes] = useState([]);
    const [summary, setSummary] = useState(null);

    const fetchData = async () => {
        try {
            // Fetch heatmap data
            const heatmapRes = await axios.get(`${BACKEND_URL}/api/heatmap/data`);
            if (heatmapRes.data?.hotspots) {
                setPotholes(heatmapRes.data.hotspots);
            }

            // Fetch dashboard summary
            const summaryRes = await axios.get(`${BACKEND_URL}/api/dashboard/summary`);
            if (summaryRes.data) {
                setSummary(summaryRes.data);
            }
        } catch (error) {
            console.error('Dashboard data fetch failed:', error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const rhi = summary?.road_health_index ?? '--';
    const totalReports = summary?.total_reports ?? 0;
    const severeCount = summary?.severity_breakdown?.severe ?? 0;
    const moderateCount = summary?.severity_breakdown?.moderate ?? 0;

    const rhiColor = typeof rhi === 'number'
        ? (rhi >= 70 ? theme.colors.success : rhi >= 40 ? theme.colors.warning : theme.colors.critical)
        : theme.colors.textSecondary;

    // Tactical Leaflet HTML (Esri Tactical Dark Canvas, No Google API key required)
    const leafletHtml = useMemo(() => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html, #map { width: 100%; height: 100%; background: #09090b; overflow: hidden; }
        .custom-marker {
            display: flex; align-items: center; justify-content: center;
            width: 22px; height: 22px; border-radius: 4px;
            background: #121215; border: 1px solid; font-size: 10px; font-weight: 700;
        }
        .marker-severe { border-color: #ef4444; color: #ef4444; }
        .marker-moderate { border-color: #f59e0b; color: #f59e0b; }
        .marker-minor { border-color: #10b981; color: #10b981; }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-popup-content-wrapper {
            background: #121215 !important; color: #fafafa !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-radius: 6px !important; font-family: monospace !important;
            font-size: 11px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-tip { background: #121215 !important; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', { zoomControl: false }).setView([18.5204, 73.8567], 13);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19, maxNativeZoom: 16
        }).addTo(map);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19, maxNativeZoom: 16
        }).addTo(map);

        var data = ${JSON.stringify(potholes)};
        var bounds = [];
        data.forEach(function(p) {
            var lat = p.coordinate ? p.coordinate.latitude : p.lat;
            var lng = p.coordinate ? p.coordinate.longitude : p.lng;
            if (!lat || !lng) return;
            bounds.push([lat, lng]);

            var sev = (p.severity || 'unknown').toLowerCase();
            var cls = 'marker-minor';
            var em = '·';
            var col = '#10b981';
            var rad = 80;
            if (sev === 'critical' || sev === 'severe') { cls = 'marker-severe'; em = '!'; col = '#ef4444'; rad = 120; }
            else if (sev === 'medium' || sev === 'moderate') { cls = 'marker-moderate'; em = '▲'; col = '#f59e0b'; rad = 100; }

            L.circle([lat, lng], { radius: rad, color: col, weight: 1, opacity: 0.5, fillColor: col, fillOpacity: 0.12 }).addTo(map);
            var icon = L.divIcon({ className: '', html: '<div class="custom-marker ' + cls + '">' + em + '</div>', iconSize: [22, 22], iconAnchor: [11, 11] });
            L.marker([lat, lng], { icon: icon }).bindPopup('<b style="color:' + col + '">' + sev.toUpperCase() + '</b><br>LAT: ' + lat.toFixed(4) + '<br>LNG: ' + lng.toFixed(4)).addTo(map);
        });

        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    </script>
</body>
</html>
    `, [potholes]);

    return (
        <View style={styles.container}>
            {/* Header Toolbar */}
            <View style={styles.header}>
                <View style={styles.systemBar}>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>TELEMETRY ACTIVE</Text>
                    </View>
                    <Text style={styles.engineText}>RF-DETR 2.0</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{totalReports}</Text>
                        <Text style={styles.statLabel}>INCIDENTS</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: theme.colors.critical }]}>{severeCount}</Text>
                        <Text style={styles.statLabel}>SEVERE</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: theme.colors.warning }]}>{moderateCount}</Text>
                        <Text style={styles.statLabel}>MODERATE</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <View style={styles.rhiRow}>
                            <Activity color={rhiColor} size={13} strokeWidth={2} />
                            <Text style={[styles.statValue, { color: rhiColor }]}>
                                {typeof rhi === 'number' ? rhi.toFixed(0) : '--'}
                            </Text>
                        </View>
                        <Text style={styles.statLabel}>INDEX</Text>
                    </View>
                </View>
            </View>

            {/* Map Container */}
            <View style={styles.map}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html: leafletHtml }}
                    style={{ flex: 1, backgroundColor: '#09090b' }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scalesPageToFit={false}
                />
            </View>

            {/* Bottom Floating Legend Pill */}
            <View style={styles.legendPanel}>
                <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.critical }]} />
                    <Text style={styles.legendText}>Severe</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
                    <Text style={styles.legendText}>Moderate</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                    <Text style={styles.legendText}>Low</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.canvas,
    },

    // Header Toolbar
    header: {
        paddingTop: 48,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderSubtle,
    },
    systemBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderSubtle,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.primary,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        letterSpacing: 0.6,
    },
    engineText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.textTertiary,
        fontVariant: ['tabular-nums'],
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: theme.colors.borderSubtle,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        fontVariant: ['tabular-nums'],
        letterSpacing: -0.3,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '500',
        color: theme.colors.textTertiary,
        letterSpacing: 0.5,
        marginTop: 2,
    },
    rhiRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    // Map
    map: {
        flex: 1,
        backgroundColor: theme.colors.canvas,
    },

    // Legend Floating Pill
    legendPanel: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
        borderRadius: 8,
        paddingVertical: 9,
        paddingHorizontal: 16,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
});
