import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, Easing, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Crosshair, Navigation, Aperture, AlertTriangle } from 'lucide-react-native';
import axios from 'axios';
import { theme } from '../themes';

// CHANGE THIS TO YOUR COMPUTER'S LOCAL IP ADDRESS (e.g., '192.168.x.x') 
// Do NOT use 'localhost' or '127.0.0.1' because the Expo app runs on your phone's network
const BACKEND_URL = 'http://192.168.1.9:8000/api/reports/submit';

const { width, height } = Dimensions.get('window');

export default function CameraScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraFacing, setCameraFacing] = useState('back');
    const [location, setLocation] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);

    const cameraRef = useRef(null);
    const scanAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        (async () => {
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            if (locationStatus === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation(loc);
            }
        })();
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
                })
            ])
        ).start();
    };

    const stopScanAnimation = () => {
        Animated.loop(
            Animated.timing(scanAnim, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            })
        ).stop();
    };

    const handleScan = async () => {
        if (!cameraRef.current) return;

        setIsScanning(true);
        startScanAnimation();

        // Simulate taking photo and calling teammate's backend
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                skipProcessing: true,
                base64: true, // We need base64 to send the image easily 
            });

            // Prepare the form data exactly how the FastAPI backend expects it
            const formData = new FormData();

            // Convert the photo URI to a blob file format expected by FastAPI's UploadFile
            const filename = photo.uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image`;

            formData.append('image', {
                uri: photo.uri,
                name: filename,
                type: type
            });
            formData.append('lat', location ? location.coords.latitude : 0.0);
            formData.append('lng', location ? location.coords.longitude : 0.0);

            // Send to teammate's AMD ROCm pipeline
            console.log("Transmitting to: ", BACKEND_URL);
            const response = await axios.post(BACKEND_URL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log("Response from AMD Server:", response.data);

            setIsScanning(false);
            stopScanAnimation();

            // Set the result based on the actual Model returned payload
            setScanResult({
                status: response.data.status,
                severity: response.data.severity,
                confidence: response.data.confidence,
                report_id: response.data.report_id,
            });

        } catch (error) {
            console.error("Scanning failed", error);
            setIsScanning(false);
            stopScanAnimation();
        }
    };

    if (!permission) {
        return <View style={styles.container}><Text style={styles.text}>Requesting permissions...</Text></View>;
    }
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>We need permission to show the camera</Text>
                <View style={{ padding: 40 }}>
                    <TouchableOpacity style={styles.captureBtnActive} onPress={requestPermission}>
                        <Text style={[styles.text, { marginTop: 0 }]}>GRANT PERMISSION</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const scanLineTranslateY = scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 300] // Size of the scanner box
    });

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing={cameraFacing} ref={cameraRef}>

                {/* Top HUD */}
                <View style={styles.hudTop}>
                    <View style={styles.hudPanel}>
                        <Text style={styles.hudTextTitle}>SYSTEM STATUS</Text>
                        <Text style={styles.hudTextValue}>AMD AI ENGINE ACTIVE</Text>
                    </View>
                    {location && (
                        <View style={styles.hudPanel}>
                            <View style={styles.row}>
                                <Navigation color={theme.colors.primary} size={14} />
                                <Text style={styles.hudTextValuesml}>  {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Center Reticle / Scanner Overlay */}
                <View style={styles.scannerWrapper}>
                    <View style={styles.scannerBox}>
                        <Crosshair color={isScanning ? theme.colors.warning : theme.colors.primary} size={48} />

                        {isScanning && (
                            <Animated.View style={[
                                styles.scanLine,
                                { transform: [{ translateY: scanLineTranslateY }] }
                            ]}
                            />
                        )}

                        {/* Corner Brackets for Cyberpunk Feel */}
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                </View>

                {/* Results Overlay (Glassmorphism Panel) */}
                {scanResult && !isScanning && (
                    <View style={styles.resultPanel}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.resultTitle}>ANALYSIS COMPLETE</Text>
                            {scanResult.severity === 'Critical' ? (
                                <AlertTriangle color={theme.colors.critical} size={24} />
                            ) : (
                                <Aperture color={theme.colors.success} size={24} />
                            )}
                        </View>
                        <View style={styles.separator} />
                        <View style={styles.rowBetween}>
                            <Text style={styles.resultLabel}>SEVERITY:</Text>
                            <Text style={[
                                styles.resultValue,
                                {
                                    color: scanResult.severity === 'Critical' ? theme.colors.critical :
                                        scanResult.severity === 'Medium' ? theme.colors.warning : theme.colors.success
                                }
                            ]}>{scanResult.severity.toUpperCase()}</Text>
                        </View>
                        <View style={styles.rowBetween}>
                            <Text style={styles.resultLabel}>DETECTED:</Text>
                            <Text style={styles.resultValue}>REPORT LOGGED (#{scanResult.report_id?.substring(0, 6)})</Text>
                        </View>
                        <View style={styles.rowBetween}>
                            <Text style={styles.resultLabel}>CONFIDENCE:</Text>
                            <Text style={styles.resultValue}>{(scanResult.confidence * 100).toFixed(1)}%</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setScanResult(null)}
                        >
                            <Text style={styles.closeBtnText}>ACKNOWLEDGE</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Bottom Controls */}
                <View style={styles.controlsBottom}>
                    <TouchableOpacity
                        style={[styles.captureBtn, isScanning && styles.captureBtnActive]}
                        onPress={handleScan}
                        disabled={isScanning}
                    >
                        <View style={styles.captureBtnInner}>
                            <Aperture color={theme.colors.background} size={32} />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.scanText}>
                        {isScanning ? 'TRANSMITTING TO NODE...' : 'INITIATE TACTICAL SCAN'}
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
    },
    camera: {
        flex: 1,
    },
    text: {
        color: theme.colors.text,
        textAlign: 'center',
        marginTop: 100,
    },
    hudTop: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    hudPanel: {
        backgroundColor: 'rgba(10, 10, 10, 0.65)',
        padding: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(0, 240, 255, 0.3)',
    },
    hudTextTitle: {
        ...theme.typography.subheading,
        fontSize: 10,
        color: theme.colors.textDim,
        marginBottom: 2,
    },
    hudTextValue: {
        ...theme.typography.body,
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 12,
    },
    hudTextValuesml: {
        ...theme.typography.body,
        color: theme.colors.text,
        fontSize: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scannerWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerBox: {
        width: 300,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,240,255,0.05)',
    },
    scanLine: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: 2,
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: theme.colors.primary,
    },
    topLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
    topRight: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
    bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
    bottomRight: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },

    resultPanel: {
        position: 'absolute',
        top: '25%',
        left: 40,
        right: 40,
        backgroundColor: 'rgba(10, 10, 10, 0.85)',
        padding: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        zIndex: 20,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 15,
    },
    resultTitle: {
        ...theme.typography.heading,
        fontSize: 18,
        color: theme.colors.text,
    },
    resultLabel: {
        ...theme.typography.body,
        color: theme.colors.textDim,
        fontSize: 12,
        letterSpacing: 1,
    },
    resultValue: {
        ...theme.typography.body,
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
    closeBtn: {
        marginTop: 20,
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 4,
    },
    closeBtnText: {
        ...theme.typography.body,
        color: theme.colors.background,
        fontWeight: 'bold',
        letterSpacing: 1,
    },

    controlsBottom: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 240, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        marginBottom: 15,
    },
    captureBtnActive: {
        backgroundColor: 'rgba(255, 179, 0, 0.3)',
        borderColor: theme.colors.warning,
    },
    captureBtnInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanText: {
        ...theme.typography.subheading,
        fontSize: 12,
        color: theme.colors.text,
    }
});
