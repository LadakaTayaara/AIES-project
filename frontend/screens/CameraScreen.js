import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, Easing, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Crosshair, Navigation, Aperture, AlertTriangle, CheckCircle } from 'lucide-react-native';
import axios from 'axios';
import { theme } from '../themes';
import Constants from 'expo-constants';

// ── Dynamic backend URL detection ───────────────────────────
// Automatically determines the backend URL based on the Expo dev server
function getBackendUrl() {
    // Try to get the dev server host from Expo
    const debuggerHost = Constants.expoConfig?.hostUri
        || Constants.manifest?.debuggerHost
        || Constants.manifest2?.extra?.expoGo?.debuggerHost;

    if (debuggerHost) {
        const host = debuggerHost.split(':')[0];
        return `http://${host}:8000`;
    }

    // Fallback — change this to your PC's local IP if auto-detection fails
    return 'http://192.168.1.9:8000';
}

const BACKEND_URL = getBackendUrl();
const SUBMIT_URL = `${BACKEND_URL}/api/reports/submit`;

const { width, height } = Dimensions.get('window');

export default function CameraScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraFacing, setCameraFacing] = useState('back');
    const [location, setLocation] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const cameraRef = useRef(null);
    const scanAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                try {
                    const loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                    });
                    setLocation(loc);
                } catch (e) {
                    console.warn('Location fetch failed:', e);
                }
            }
        })();

        // Pulse animation for capture button
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const startScanAnimation = () => {
        scanAnim.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(scanAnim, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const stopScanAnimation = () => {
        scanAnim.stopAnimation();
        scanAnim.setValue(0);
    };

    const handleScan = async () => {
        if (!cameraRef.current || isScanning) return;

        setIsScanning(true);
        setErrorMsg(null);
        setScanResult(null);
        startScanAnimation();

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                skipProcessing: true,
                base64: false,
            });

            // Prepare FormData
            const formData = new FormData();

            const filename = photo.uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('image', {
                uri: photo.uri,
                name: filename || 'photo.jpg',
                type: type,
            });

            formData.append('lat', location ? location.coords.latitude.toString() : '0.0');
            formData.append('lng', location ? location.coords.longitude.toString() : '0.0');

            console.log(`Submitting to: ${SUBMIT_URL}`);

            const response = await axios.post(SUBMIT_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30000,
            });

            console.log('Detection result:', response.data);

            setScanResult({
                severity: response.data.severity,
                confidence: response.data.confidence,
                report_id: response.data.report_id,
                num_detections: response.data.num_detections,
                status: response.data.status,
            });

        } catch (error) {
            console.error('Scan failed:', error);
            const msg = error.response?.data?.detail
                || error.message
                || 'Connection failed';
            setErrorMsg(msg);
        } finally {
            setIsScanning(false);
            stopScanAnimation();
        }
    };

    // Permission handling
    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>Requesting camera access...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <View style={styles.permissionBox}>
                    <Aperture color={theme.colors.primary} size={48} />
                    <Text style={styles.permissionTitle}>Camera Access Required</Text>
                    <Text style={styles.permissionDesc}>
                        We need camera access to scan and detect potholes on the road.
                    </Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                        <Text style={styles.permissionBtnText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const scanLineTranslateY = scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 280],
    });

    const getSeverityColor = (sev) => {
        if (!sev) return theme.colors.textDim;
        switch (sev.toLowerCase()) {
            case 'severe': return theme.colors.critical;
            case 'moderate': return theme.colors.warning;
            case 'minor': return theme.colors.success;
            default: return theme.colors.textDim;
        }
    };

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing={cameraFacing} ref={cameraRef}>

                {/* Top HUD */}
                <View style={styles.hudTop}>
                    <View style={styles.hudPanel}>
                        <Text style={styles.hudLabel}>RF-DETR ENGINE</Text>
                        <Text style={styles.hudValue}>ACTIVE</Text>
                    </View>
                    {location && (
                        <View style={styles.hudPanel}>
                            <View style={styles.row}>
                                <Navigation color={theme.colors.primaryLight} size={12} />
                                <Text style={styles.hudCoords}>
                                    {' '}{location.coords.latitude.toFixed(5)}, {location.coords.longitude.toFixed(5)}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Scanner Reticle */}
                <View style={styles.scannerWrapper}>
                    <View style={styles.scannerBox}>
                        <Crosshair
                            color={isScanning ? theme.colors.warning : theme.colors.primaryLight}
                            size={40}
                        />

                        {isScanning && (
                            <Animated.View
                                style={[
                                    styles.scanLine,
                                    { transform: [{ translateY: scanLineTranslateY }] },
                                ]}
                            />
                        )}

                        {/* Corner brackets */}
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                </View>

                {/* Error Message */}
                {errorMsg && !isScanning && (
                    <View style={styles.errorPanel}>
                        <AlertTriangle color={theme.colors.critical} size={20} />
                        <Text style={styles.errorText}>{errorMsg}</Text>
                        <TouchableOpacity onPress={() => setErrorMsg(null)}>
                            <Text style={styles.dismissText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Results Panel */}
                {scanResult && !isScanning && (
                    <View style={styles.resultPanel}>
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultTitle}>Analysis Complete</Text>
                            {scanResult.severity === 'severe' ? (
                                <AlertTriangle color={theme.colors.critical} size={22} />
                            ) : (
                                <CheckCircle color={theme.colors.success} size={22} />
                            )}
                        </View>

                        <View style={styles.separator} />

                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>SEVERITY</Text>
                            <Text style={[styles.resultValue, { color: getSeverityColor(scanResult.severity) }]}>
                                {(scanResult.severity || 'Unknown').toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>CONFIDENCE</Text>
                            <Text style={styles.resultValue}>
                                {scanResult.confidence ? `${(scanResult.confidence * 100).toFixed(1)}%` : '--'}
                            </Text>
                        </View>
                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>DETECTIONS</Text>
                            <Text style={styles.resultValue}>{scanResult.num_detections || 0}</Text>
                        </View>
                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>REPORT</Text>
                            <Text style={styles.resultValue}>
                                #{scanResult.report_id?.substring(0, 8)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.acknowledgeBtn}
                            onPress={() => setScanResult(null)}
                        >
                            <Text style={styles.acknowledgeBtnText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Capture Button */}
                <View style={styles.controlsBottom}>
                    <Animated.View style={{ transform: [{ scale: isScanning ? 1 : pulseAnim }] }}>
                        <TouchableOpacity
                            style={[styles.captureBtn, isScanning && styles.captureBtnActive]}
                            onPress={handleScan}
                            disabled={isScanning}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.captureBtnInner, isScanning && styles.captureBtnInnerActive]}>
                                <Aperture color="#fff" size={28} />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.captureLabel}>
                        {isScanning ? 'Analyzing...' : 'Tap to Scan'}
                    </Text>
                </View>

            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
    },
    camera: {
        flex: 1,
    },

    // Permission screen
    permissionBox: {
        alignItems: 'center',
        padding: 40,
        gap: 16,
    },
    permissionText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: 8,
    },
    permissionDesc: {
        fontSize: 14,
        color: theme.colors.textDim,
        textAlign: 'center',
        lineHeight: 20,
    },
    permissionBtn: {
        marginTop: 12,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
    },
    permissionBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },

    // HUD
    hudTop: {
        position: 'absolute',
        top: 54,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    hudPanel: {
        backgroundColor: 'rgba(5, 7, 11, 0.82)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    hudLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: theme.colors.cyan,
        letterSpacing: 1.2,
        marginBottom: 1,
    },
    hudValue: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.primaryLight,
        letterSpacing: 0.8,
    },
    hudCoords: {
        fontSize: 11,
        color: '#e2e8f0',
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    // Scanner
    scannerWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerBox: {
        width: 280,
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.03)',
    },
    scanLine: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: 2,
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.95,
        shadowRadius: 14,
        elevation: 6,
    },
    corner: {
        position: 'absolute',
        width: 26,
        height: 26,
        borderColor: theme.colors.primaryLight,
    },
    topLeft: { top: 0, left: 0, borderTopWidth: 2.5, borderLeftWidth: 2.5 },
    topRight: { top: 0, right: 0, borderTopWidth: 2.5, borderRightWidth: 2.5 },
    bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
    bottomRight: { bottom: 0, right: 0, borderBottomWidth: 2.5, borderRightWidth: 2.5 },

    // Error
    errorPanel: {
        position: 'absolute',
        top: '30%',
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 23, 68, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255, 23, 68, 0.45)',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 20,
    },
    errorText: {
        flex: 1,
        color: '#fecdd3',
        fontSize: 13,
        fontWeight: '500',
    },
    dismissText: {
        color: theme.colors.critical,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // Results
    resultPanel: {
        position: 'absolute',
        top: '22%',
        left: 20,
        right: 20,
        backgroundColor: 'rgba(8, 12, 20, 0.94)',
        padding: 22,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.40)',
        zIndex: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.7,
        shadowRadius: 16,
        elevation: 10,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: 0.5,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginBottom: 14,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    resultLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.cyan,
        letterSpacing: 1,
    },
    resultValue: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.text,
    },
    acknowledgeBtn: {
        marginTop: 16,
        backgroundColor: theme.colors.primary,
        paddingVertical: 13,
        alignItems: 'center',
        borderRadius: 8,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 3,
    },
    acknowledgeBtnText: {
        color: '#080c14',
        fontWeight: '800',
        fontSize: 13,
        letterSpacing: 1,
    },

    // Capture
    controlsBottom: {
        position: 'absolute',
        bottom: 38,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        marginBottom: 8,
    },
    captureBtnActive: {
        backgroundColor: 'rgba(255, 145, 0, 0.25)',
        borderColor: theme.colors.warning,
    },
    captureBtnInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
    },
    captureBtnInnerActive: {
        backgroundColor: theme.colors.warning,
    },
    captureLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.primaryLight,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});
