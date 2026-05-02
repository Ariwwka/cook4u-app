import React from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width } = Dimensions.get('window')

const TEASER_CHEFS = [
  { id: '1', emoji: '🍛', name: "Amara's Kitchen", cuisine: 'West African', rating: '4.9' },
  { id: '2', emoji: '🍜', name: "Mei's Noodles", cuisine: 'Chinese', rating: '5.0' },
  { id: '3', emoji: '🥘', name: "Sofia's Table", cuisine: 'Italian', rating: '4.8' },
  { id: '4', emoji: '🧆', name: "Fatima's Feast", cuisine: 'Middle Eastern', rating: '4.9' },
  { id: '5', emoji: '🍱', name: "Yuki's Bento", cuisine: 'Japanese', rating: '4.7' },
]

function TeaserCard({ item }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardEmoji}>{item.emoji}</Text>
      <Text style={styles.cardName}>{item.name}</Text>
      <Text style={styles.cardCuisine}>{item.cuisine}</Text>
      <Text style={styles.cardRating}>⭐ {item.rating}</Text>
    </View>
  )
}

export default function LandingScreen({ navigation }) {
  const insets = useSafeAreaInsets()

  return (
    <LinearGradient
      colors={['#FF6B00', '#F97316', '#FDBA74']}
      style={styles.gradient}
    >
      <View style={[styles.topSection, { paddingTop: insets.top + 32 }]}>
        <Text style={styles.wordmark}>Cook4U</Text>
        <Text style={styles.tagline}>Home-cooked meals from local chefs</Text>
      </View>

      <View style={styles.middleSection}>
        <FlatList
          data={TEASER_CHEFS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TeaserCard item={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          snapToInterval={176}
          decelerationRate="fast"
        />
      </View>

      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.joinLabel}>Join Cook4U</Text>
        <TouchableOpacity
          style={styles.createAccountButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.createAccountText}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Login')}
          style={styles.loginTouchable}
        >
          <Text style={styles.loginText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.95,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 40,
  },
  flatListContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 160,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  cardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  cardCuisine: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  cardRating: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  joinLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  createAccountButton: {
    backgroundColor: '#FFFFFF',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F97316',
  },
  loginTouchable: {
    marginTop: 12,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
})
