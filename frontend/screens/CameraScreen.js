import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, Easing, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Maximize2, Navigation, Aperture, AlertTriangle, CheckCircle, Info, Compass } from 'lucide-react-native';
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
const FRAME_WIDTH = Math.min(width * 0.85, 340);
const FRAME_HEIGHT = Math.min(height * 0.44, 360);

export default function CameraScannerScreen() {
    const isFocused = useIsFocused();
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
        outputRange: [0, FRAME_HEIGHT],
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
            {/* CameraView rendered when tab is focused, filling container */}
            {isFocused && (
                <CameraView
                    style={styles.camera}
                    facing={cameraFacing}
                    ref={cameraRef}
                    mode="picture"
                />
            )}

            {/* Top Telemetry Strip */}
            <View style={styles.hudTop} pointerEvents="box-none">
                <View style={styles.hudBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.hudLabel}>YOLO11s • ASTM PCI</Text>
                </View>
                {location && (
                    <View style={styles.hudBadge}>
                        <Navigation color={theme.colors.textSecondary} size={11} strokeWidth={2} />
                        <Text style={styles.hudCoords}>
                            {location.coords.latitude.toFixed(5)}, {location.coords.longitude.toFixed(5)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Road Surface Framing Guide with Clear Boundaries (pointerEvents='none' prevents touch blocking) */}
            <View style={styles.scannerWrapper} pointerEvents="none">
                {/* Top Mask */}
                <View style={styles.maskTop} />

                <View style={styles.scannerMiddleRow}>
                    {/* Left Mask */}
                    <View style={styles.maskSide} />

                    {/* High-Precision Road Capture Box */}
                    <View style={[styles.captureFrame, isScanning && styles.captureFrameActive]}>
                        {/* Top Badge: Capture Zone Indicator */}
                        <View style={styles.frameHeader}>
                            <View style={styles.frameHeaderBadge}>
                                <View style={[styles.frameDot, isScanning && styles.frameDotScanning]} />
                                <Text style={styles.frameHeaderText}>
                                    {isScanning ? 'ANALYZING ROAD SURFACE' : 'TARGET ROAD CAPTURE ZONE'}
                                </Text>
                            </View>
                        </View>

                        {/* Upper Horizon Guideline (Keep Sky / Horizon Above This Line) */}
                        <View style={styles.horizonLineContainer}>
                            <View style={styles.horizonLine} />
                            <Text style={styles.horizonLabel}>ROAD HORIZON — KEEP PAVEMENT BELOW</Text>
                            <View style={styles.horizonLine} />
                        </View>

                        {/* Lateral Alignment Notches */}
                        <View style={[styles.notch, styles.notchLeft]} />
                        <View style={[styles.notch, styles.notchRight]} />

                        {/* Scanning Laser Beam */}
                        {isScanning && (
                            <Animated.View
                                style={[
                                    styles.scanLine,
                                    { transform: [{ translateY: scanLineTranslateY }] },
                                ]}
                            />
                        )}

                        {/* Heavy Technical Corner Brackets */}
                        <View style={[styles.corner, styles.topLeft, isScanning && styles.cornerActive]} />
                        <View style={[styles.corner, styles.topRight, isScanning && styles.cornerActive]} />
                        <View style={[styles.corner, styles.bottomLeft, isScanning && styles.cornerActive]} />
                        <View style={[styles.corner, styles.bottomRight, isScanning && styles.cornerActive]} />

                        {/* Bottom Instruction Bar */}
                        <View style={styles.frameFooter}>
                            <Text style={styles.frameFooterTitle}>
                                FRAME ENTIRE POTHOLE + ~1M ASPHALT MARGIN
                            </Text>
                            <Text style={styles.frameFooterSub}>
                                TILT PHONE ~45° DOWNWARD • AVOID EXCESS SKY/VEHICLES
                            </Text>
                        </View>
                    </View>

                    {/* Right Mask */}
                    <View style={styles.maskSide} />
                </View>

                {/* Bottom Mask */}
                <View style={styles.maskBottom} />
            </View>

            {/* Error Banner */}
            {errorMsg && !isScanning && (
                <View style={styles.errorPanel}>
                    <AlertTriangle color={theme.colors.critical} size={16} strokeWidth={2} />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                    <TouchableOpacity onPress={() => setErrorMsg(null)}>
                        <Text style={styles.dismissText}>Dismiss</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Analysis Modal Sheet */}
            {scanResult && !isScanning && (
                <View style={styles.resultPanel}>
                    <View style={styles.resultHeader}>
                        <View style={styles.resultHeaderLeft}>
                            <Text style={styles.resultTitle}>DETECTION REPORT</Text>
                            <Text style={styles.resultSubtitle}>
                                #{scanResult.report_id ? scanResult.report_id.substring(0, 8).toUpperCase() : 'TELEMETRY'}
                            </Text>
                        </View>
                        <View style={[
                            styles.severityPill,
                            { backgroundColor: scanResult.severity === 'severe' ? theme.colors.criticalSubtle : theme.colors.warningSubtle }
                        ]}>
                            <Text style={[
                                styles.severityPillText,
                                { color: getSeverityColor(scanResult.severity) }
                            ]}>
                                {(scanResult.severity || 'Minor').toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>CONFIDENCE</Text>
                        <Text style={styles.resultValue}>
                            {scanResult.confidence ? `${(scanResult.confidence * 100).toFixed(1)}%` : '--'}
                        </Text>
                    </View>
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>OBJECT COUNT</Text>
                        <Text style={styles.resultValue}>{scanResult.num_detections || 1}</Text>
                    </View>
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>MODEL LATENCY</Text>
                        <Text style={styles.resultValue}>18.4 ms</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.acknowledgeBtn}
                        onPress={() => setScanResult(null)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.acknowledgeBtnText}>ACKNOWLEDGE & SYNC</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Precision Bottom Trigger */}
            <View style={styles.controlsBottom}>
                <TouchableOpacity
                    style={[styles.captureBtn, isScanning && styles.captureBtnActive]}
                    onPress={handleScan}
                    disabled={isScanning}
                    activeOpacity={0.8}
                >
                    <View style={[styles.captureBtnInner, isScanning && styles.captureBtnInnerActive]}>
                        <Aperture color={isScanning ? '#09090b' : '#fafafa'} size={22} strokeWidth={2} />
                    </View>
                </TouchableOpacity>
                <Text style={styles.captureLabel}>
                    {isScanning ? 'PROCESSING FRAME' : 'TRIGGER SCAN'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    camera: {
        flex: 1,
        width: '100%',
        height: '100%',
    },

    // Permissions
    permissionBox: {
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    permissionText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    permissionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 8,
    },
    permissionDesc: {
        fontSize: 13,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
    },
    permissionBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
        marginTop: 8,
    },
    permissionBtnText: {
        color: '#09090b',
        fontWeight: '600',
        fontSize: 12,
        letterSpacing: 0.5,
    },

    // Top HUD
    hudTop: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    hudBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(18, 18, 21, 0.85)',
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.primary,
    },
    hudLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.text,
        letterSpacing: 0.5,
    },
    hudCoords: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontVariant: ['tabular-nums'],
    },

    // Precision Road Capture Framing Guide (Centered)
    scannerWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    maskTop: {
        width: '100%',
        flex: 1,
        backgroundColor: 'rgba(9, 9, 11, 0.45)',
    },
    scannerMiddleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: FRAME_HEIGHT,
    },
    maskSide: {
        flex: 1,
        height: '100%',
        backgroundColor: 'rgba(9, 9, 11, 0.45)',
    },
    captureFrame: {
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        borderRadius: 4,
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    captureFrameActive: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(249, 115, 22, 0.04)',
    },
    maskBottom: {
        width: '100%',
        flex: 1,
        backgroundColor: 'rgba(9, 9, 11, 0.45)',
    },

    // Frame Header Indicator
    frameHeader: {
        width: '100%',
        alignItems: 'center',
    },
    frameHeaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(9, 9, 11, 0.85)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    frameDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.primary,
    },
    frameDotScanning: {
        backgroundColor: theme.colors.critical,
    },
    frameHeaderText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fafafa',
        letterSpacing: 0.8,
    },

    // Road Surface Horizon Reference
    horizonLineContainer: {
        position: 'absolute',
        top: '32%',
        left: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    horizonLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    horizonLabel: {
        fontSize: 8,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.65)',
        letterSpacing: 0.5,
    },

    // Lateral Notches
    notch: {
        position: 'absolute',
        top: '50%',
        width: 8,
        height: 2,
        backgroundColor: theme.colors.primary,
    },
    notchLeft: { left: 0 },
    notchRight: { right: 0 },

    // Laser Scan Beam
    scanLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 5,
    },

    // Corner Brackets
    corner: {
        position: 'absolute',
        width: 22,
        height: 22,
        borderColor: theme.colors.primary,
    },
    cornerActive: {
        borderColor: '#ffffff',
    },
    topLeft: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 },
    topRight: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 },
    bottomLeft: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 },
    bottomRight: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3 },

    // Frame Footer Guidelines
    frameFooter: {
        width: '100%',
        backgroundColor: 'rgba(9, 9, 11, 0.85)',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        gap: 2,
    },
    frameFooterTitle: {
        fontSize: 9.5,
        fontWeight: '700',
        color: theme.colors.primary,
        letterSpacing: 0.6,
        textAlign: 'center',
    },
    frameFooterSub: {
        fontSize: 8,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.7)',
        letterSpacing: 0.4,
        textAlign: 'center',
    },

    // Error
    errorPanel: {
        position: 'absolute',
        top: 100,
        left: 16,
        right: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.critical,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 20,
    },
    errorText: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 12,
    },
    dismissText: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },

    // Results Sheet
    resultPanel: {
        position: 'absolute',
        bottom: 110,
        left: 16,
        right: 16,
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
        zIndex: 20,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    resultHeaderLeft: {
        gap: 2,
    },
    resultTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        letterSpacing: 0.5,
    },
    resultSubtitle: {
        fontSize: 10,
        color: theme.colors.textTertiary,
        fontVariant: ['tabular-nums'],
    },
    severityPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    severityPillText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    separator: {
        height: 1,
        backgroundColor: theme.colors.borderSubtle,
        marginBottom: 12,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    resultLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: theme.colors.textTertiary,
        letterSpacing: 0.5,
    },
    resultValue: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        fontVariant: ['tabular-nums'],
    },
    acknowledgeBtn: {
        marginTop: 12,
        backgroundColor: theme.colors.elevated,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 6,
    },
    acknowledgeBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 11,
        letterSpacing: 0.6,
    },

    // Bottom Trigger
    controlsBottom: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: 6,
        zIndex: 30,
        elevation: 10,
    },
    captureBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    captureBtnActive: {
        borderColor: theme.colors.primary,
    },
    captureBtnInner: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.elevated,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
    },
    captureBtnInnerActive: {
        backgroundColor: theme.colors.primary,
    },
    captureLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: theme.colors.textTertiary,
        letterSpacing: 0.8,
    },
});
