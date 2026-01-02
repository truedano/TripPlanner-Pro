import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { TripData, SpotType } from '../types';

// Register a Chinese font (Noto Sans TC)
Font.register({
    family: 'Noto Sans TC',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/notosanstc/v38/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz76Cy_Co.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/notosanstc/v38/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz70e1_Co.ttf', fontWeight: 700 }
    ]
});

// Styles
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Noto Sans TC',
        backgroundColor: '#FDFDFC',
        color: '#1E293B' // slate-800
    },
    titlePage: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tripTitle: {
        fontSize: 32,
        marginBottom: 10,
        fontWeight: 'bold',
        color: '#0F172A', // slate-900
        textAlign: 'center'
    },
    tripDate: {
        fontSize: 12,
        color: '#94A3B8', // slate-400
        marginBottom: 40,
        letterSpacing: 2
    },
    sectionTitle: {
        fontSize: 18,
        marginTop: 20,
        marginBottom: 10,
        color: '#334155', // slate-700
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0', // slate-200
        paddingBottom: 5
    },
    // Day Header
    dayHeader: {
        marginTop: 20,
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#F8FAFC', // slate-50
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    dayTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3B82F6' // blue-500
    },
    dayDate: {
        fontSize: 12,
        color: '#64748B' // slate-500
    },
    // Spot Item (General)
    spotContainer: {
        marginBottom: 15,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9', // slate-100
    },
    spotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
        alignItems: 'center'
    },
    spotTypeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 8,
        color: '#FFFFFF'
    },
    spotTime: {
        fontSize: 10,
        color: '#94A3B8'
    },
    spotName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4
    },
    spotNote: {
        fontSize: 10,
        color: '#64748B',
        // fontStyle: 'italic', // Removed to avoid missing font error
        marginTop: 5,
        paddingLeft: 5,
        borderLeftWidth: 2,
        borderLeftColor: '#E2E8F0'
    },
    spotImagesRow: {
        flexDirection: 'row',
        marginTop: 5,
        gap: 5
    },
    spotImage: {
        width: 100,
        height: 100,
        objectFit: 'cover',
        borderRadius: 4
    },
    // Budget Table
    tableContainer: {
        marginTop: 10
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        padding: 8,
        borderBottomWidth: 1,
        borderColor: '#CBD5E1'
    },
    tableRow: {
        flexDirection: 'row',
        padding: 8,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9'
    },
    col1: { width: '15%', fontSize: 10 },
    col2: { width: '45%', fontSize: 10 },
    col3: { width: '25%', fontSize: 10 },
    col4: { width: '15%', fontSize: 10, textAlign: 'right' },
    // Summary Cards
    summaryCards: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    card: {
        width: '30%',
        padding: 15,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        alignItems: 'center'
    },
    cardLabel: {
        fontSize: 8,
        color: '#94A3B8',
        marginBottom: 5
    },
    cardValue: {
        fontSize: 18,
        fontWeight: 'bold'
    }
});

interface Props {
    tripData: TripData;
    viewMode: 'itinerary' | 'journal' | 'budget';
}

const SpotTypeColors: Record<string, string> = {
    [SpotType.SPOT]: '#3B82F6', // Blue
    [SpotType.TRANSPORT]: '#F97316', // Orange
    [SpotType.STAY]: '#A855F7', // Purple
    [SpotType.MEAL]: '#F43F5E' // Rose
};

const SpotTypeLabels: Record<string, string> = {
    [SpotType.SPOT]: '景點',
    [SpotType.TRANSPORT]: '交通',
    [SpotType.STAY]: '住宿',
    [SpotType.MEAL]: '伙食'
};

export const TripPdfDocument: React.FC<Props> = ({ tripData, viewMode }) => {
    const currency = tripData.currency || 'TWD';

    // Helper to render spots
    const renderSpot = (spot: any, simple: boolean = false) => {
        const typeColor = SpotTypeColors[spot.type || SpotType.SPOT] || SpotTypeColors[SpotType.SPOT];
        const typeLabel = SpotTypeLabels[spot.type || SpotType.SPOT] || '景點';

        return (
            <View key={spot.id} style={styles.spotContainer} wrap={false}>
                <View style={styles.spotHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.spotTypeBadge, { backgroundColor: typeColor }]}>{typeLabel}</Text>
                        <Text style={[styles.spotTime, { marginLeft: 5 }]}>
                            {spot.startTime} {spot.endTime ? `- ${spot.endTime}` : ''}
                        </Text>
                    </View>
                    {spot.expenses && spot.expenses.length > 0 && (
                        <Text style={{ fontSize: 10, color: '#059669', backgroundColor: '#ECFDF5', padding: 2, borderRadius: 2 }}>
                            {currency} {spot.expenses.reduce((a: number, c: any) => a + c.amount, 0).toLocaleString()}
                        </Text>
                    )}
                </View>

                <Text style={styles.spotName}>{spot.name}</Text>

                {!simple && spot.notes && (
                    <View style={styles.spotNote}>
                        {Array.isArray(spot.notes) ? (
                            spot.notes.map((n: any) => <Text key={n.id}>{n.content}</Text>)
                        ) : (
                            <Text>{spot.notes}</Text>
                        )}
                    </View>
                )}

                {!simple && spot.images && spot.images.length > 0 && (
                    <View style={styles.spotImagesRow}>
                        {spot.images.slice(0, 3).map((img: any, idx: number) => (
                            <Image key={idx} src={img.url} style={styles.spotImage} />
                        ))}
                    </View>
                )}
            </View>
        );
    };

    // Journal View (Full details, photos)
    const renderJournal = () => (
        <Page size="A4" style={styles.page}>
            <View style={styles.titlePage}>
                <Text style={styles.tripTitle}>{tripData.name}</Text>
                <Text style={styles.tripDate}>{tripData.startDate} — {tripData.endDate}</Text>
                <Text style={{ fontSize: 14, color: '#64748B' }}>回憶日誌</Text>
            </View>

            {tripData.days.map((day, idx) => (
                <View key={day.date} break={idx > 0}>
                    <View style={styles.dayHeader}>
                        <Text style={styles.dayTitle}>Day {idx + 1}</Text>
                        <Text style={styles.dayDate}>{day.date}</Text>
                    </View>
                    {day.spots.map(spot => renderSpot(spot, false))}
                </View>
            ))}
        </Page>
    );

    // Itinerary View (Compact, no photos)
    const renderItinerary = () => (
        <Page size="A4" style={styles.page}>
            <View style={{ marginBottom: 20 }}>
                <Text style={styles.tripTitle}>{tripData.name}</Text>
                <Text style={styles.tripDate}>{tripData.startDate} — {tripData.endDate}</Text>
            </View>

            {tripData.days.map((day, idx) => (
                <View key={day.date}>
                    <View style={[styles.dayHeader, { marginTop: idx === 0 ? 0 : 20 }]}>
                        <Text style={styles.dayTitle}>Day {idx + 1}</Text>
                        <Text style={styles.dayDate}>{day.date}</Text>
                    </View>
                    {day.spots.map(spot => renderSpot(spot, true))}
                </View>
            ))}
        </Page>
    );

    // Budget View
    const renderBudget = () => {
        const allSpots = tripData.days.flatMap(d => d.spots);
        const totalActual = allSpots.reduce((sum, s) =>
            sum + (s.expenses?.reduce((acc: number, e: any) => acc + (e.amount || 0), 0) || 0), 0
        );
        const budget = tripData.totalBudget || totalActual || 1;
        const remaining = budget - totalActual;

        const detailedExpenses = tripData.days.flatMap((day, dayIdx) =>
            day.spots.flatMap(spot =>
                (spot.expenses || []).map((exp: any) => ({
                    day: dayIdx + 1,
                    spotName: spot.name,
                    name: exp.name,
                    amount: exp.amount
                }))
            )
        ).filter(e => e.amount > 0 || e.name);

        return (
            <Page size="A4" style={styles.page}>
                <View style={{ marginBottom: 20 }}>
                    <Text style={styles.tripTitle}>{tripData.name}</Text>
                    <Text style={styles.tripDate}>財務報告</Text>
                </View>

                <View style={styles.summaryCards}>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>總預算</Text>
                        <Text style={[styles.cardValue, { color: '#334155' }]}>
                            {currency} {tripData.totalBudget?.toLocaleString() || '--'}
                        </Text>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>實際支出</Text>
                        <Text style={[styles.cardValue, { color: '#059669' }]}>
                            {currency} {totalActual.toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>剩餘/超支</Text>
                        <Text style={[styles.cardValue, { color: remaining < 0 ? '#E11D48' : '#334155' }]}>
                            {currency} {Math.abs(remaining).toLocaleString()}
                            {remaining < 0 ? ' (超支)' : ''}
                        </Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>支出明細表</Text>
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.col1}>天數</Text>
                        <Text style={styles.col2}>項目/景點</Text>
                        <Text style={styles.col3}>支出名稱</Text>
                        <Text style={styles.col4}>金額</Text>
                    </View>
                    {detailedExpenses.map((exp, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.col1}>Day {exp.day}</Text>
                            <Text style={styles.col2}>{exp.spotName}</Text>
                            <Text style={styles.col3}>{exp.name}</Text>
                            <Text style={styles.col4}>{exp.amount.toLocaleString()}</Text>
                        </View>
                    ))}
                    {detailedExpenses.length === 0 && (
                        <Text style={{ textAlign: 'center', marginTop: 20, color: '#94A3B8', fontSize: 12 }}>
                            無支出紀錄
                        </Text>
                    )}
                </View>
            </Page>
        );
    };

    return (
        <Document>
            {viewMode === 'journal' && renderJournal()}
            {viewMode === 'itinerary' && renderItinerary()}
            {viewMode === 'budget' && renderBudget()}
        </Document>
    );
};
