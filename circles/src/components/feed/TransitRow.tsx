import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import { OpenCircle } from '../../types/feed.types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type FeedStackParamList = {
  OpenCircleDetailScreen: { circleId: string };
};

interface TransitRowProps {
  userCity: string;
}

export const TransitRow: React.FC<TransitRowProps> = ({ userCity }) => {
  const [transitCircles, setTransitCircles] = useState<OpenCircle[]>([]);
  const navigation = useNavigation<StackNavigationProp<FeedStackParamList>>();

  useEffect(() => {
    const fetchTransitCircles = async () => {
      // Remove ' 📍' if present in city string
      const cleanCity = userCity.replace(' 📍', '').trim();
      if (!cleanCity || cleanCity === 'Near me') return;

      const today = new Date();
      const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

      try {
        const q = query(
          collection(firestore, 'public_circles'),
          where('isArchived', '==', false),
          where('category', '==', 'travel'),
          where('transitMode', '==', 'train'),
          where('city', '==', cleanCity),
          where('transitDate', '==', formattedDate),
          limit(5)
        );

        const snapshot = await getDocs(q);
        const circles: OpenCircle[] = [];
        snapshot.forEach((doc) => circles.push({ id: doc.id, ...doc.data() } as OpenCircle));
        setTransitCircles(circles);
      } catch (error) {
        console.error('Error fetching transit row:', error);
      }
    };

    fetchTransitCircles();
  }, [userCity]);

  if (transitCircles.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's trains near you 🚂</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {transitCircles.map((circle) => (
          <TouchableOpacity 
            key={circle.id} 
            style={styles.card}
            onPress={() => navigation.navigate('OpenCircleDetailScreen', { circleId: circle.id })}
          >
            <Text style={styles.cardRoute}>{circle.transitRoute}</Text>
            <Text style={styles.cardName} numberOfLines={1}>{circle.name}</Text>
            <Text style={styles.cardMembers}>👥 {circle.memberCount} members</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    width: 200,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardRoute: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  cardMembers: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
