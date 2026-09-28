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
        : theme.colors.cyan;

    // Tactical Leaflet HTML (100% Free Esri Dark Canvas, No Google API key required)
    const leafletHtml = useMemo(() => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html, #map { width: 100%; height: 100%; background: #06090e; overflow: hidden; }
        .custom-marker {
            display: flex; align-items: center; justify-content: center;
            width: 26px; height: 26px; border-radius: 50%;
            background: #06090e; border: 2px solid; font-size: 11px;
            box-shadow: 0 0 10px rgba(0,0,0,0.85);
        }
        .marker-severe { border-color: #ff1744; color: #ff1744; box-shadow: 0 0 14px rgba(255,23,68,0.7); }
        .marker-moderate { border-color: #ff9100; color: #ff9100; box-shadow: 0 0 12px rgba(255,145,0,0.6); }
        .marker-minor { border-color: #00e676; color: #00e676; box-shadow: 0 0 10px rgba(0,230,118,0.5); }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-popup-content-wrapper {
            background: #0e1422 !important; color: #f8fafc !important;
            border: 1px solid rgba(245, 158, 11, 0.4) !important;
            border-radius: 8px !important; font-family: monospace !important;
            font-size: 11px !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.8) !important;
        }
        .leaflet-popup-tip { background: #0e1422 !important; }
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
            var em = '◈';
            var col = '#00e676';
            var rad = 90;
            if (sev === 'critical' || sev === 'severe') { cls = 'marker-severe'; em = '⚠'; col = '#ff1744'; rad = 140; }
            else if (sev === 'medium' || sev === 'moderate') { cls = 'marker-moderate'; em = '▲'; col = '#ff9100'; rad = 110; }

            L.circle([lat, lng], { radius: rad, color: col, weight: 1.5, opacity: 0.6, fillColor: col, fillOpacity: 0.18 }).addTo(map);
            var icon = L.divIcon({ className: '', html: '<div class="custom-marker ' + cls + '">' + em + '</div>', iconSize: [26, 26], iconAnchor: [13, 13] });
            L.marker([lat, lng], { icon: icon }).bindPopup('<b style="color:' + col + '">' + sev.toUpperCase() + ' HAZARD</b><br>LAT: ' + lat.toFixed(4) + '<br>LNG: ' + lng.toFixed(4)).addTo(map);
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
            {/* Tactical HUD Header */}
            <View style={styles.header}>
                <View style={styles.systemBar}>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>RADAR TELEMETRY // ONLINE</Text>
                    </View>
                    <Text style={styles.engineText}>RF-DETR 2.0</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{totalReports}</Text>
                        <Text style={styles.statLabel}>TARGETS</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: theme.colors.critical }]}>{severeCount}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.critical }]}>CRITICAL</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: theme.colors.warning }]}>{moderateCount}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.warning }]}>MODERATE</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <View style={styles.rhiRow}>
                            <Activity color={rhiColor} size={15} />
                            <Text style={[styles.statValue, { color: rhiColor }]}>
                                {typeof rhi === 'number' ? rhi.toFixed(0) : '--'}
                            </Text>
                        </View>
                        <Text style={[styles.statLabel, { color: theme.colors.cyan }]}>HEALTH IDX</Text>
                    </View>
                </View>
            </View>

            {/* Tactical Map Container */}
            <View style={styles.map}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html: leafletHtml }}
                    style={{ flex: 1, backgroundColor: '#06090e' }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scalesPageToFit={false}
                />
            </View>

            {/* Tactical Legend HUD */}
            <View style={styles.legendPanel}>
                <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.critical, shadowColor: theme.colors.critical }]} />
                    <Text style={styles.legendText}>CRITICAL HAZARD</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.warning, shadowColor: theme.colors.warning }]} />
                    <Text style={styles.legendText}>MODERATE</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.success, shadowColor: theme.colors.success }]} />
                    <Text style={styles.legendText}>MONITORED</Text>
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

    // Header
    header: {
        paddingTop: 52,
        paddingBottom: 14,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(245, 158, 11, 0.20)',
    },
    systemBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
        elevation: 3,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.primaryLight,
        letterSpacing: 1.2,
    },
    engineText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.cyan,
        letterSpacing: 0.8,
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
        height: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: theme.colors.textDim,
        letterSpacing: 0.8,
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
        backgroundColor: '#06090e',
    },

    // Legend
    legendPanel: {
        position: 'absolute',
        bottom: 22,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(10, 15, 26, 0.90)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.25)',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 6,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 2,
    },
    legendText: {
        fontSize: 9,
        color: theme.colors.textSecondary,
        fontWeight: '700',
        letterSpacing: 0.6,
    },
});
