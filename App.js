import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StripeProvider } from '@stripe/stripe-react-native'
import Constants from 'expo-constants'
import { AuthProvider } from './src/context/AuthContext'
import { CartProvider } from './src/context/CartContext'
import AppNavigator from './src/navigation'

const STRIPE_PK = Constants.expoConfig?.extra?.stripePk ?? ''

export default function App() {
  return (
    <SafeAreaProvider>
      <StripeProvider
        publishableKey={STRIPE_PK}
        merchantIdentifier="merchant.london.cook4u"
      >
        <AuthProvider>
          <CartProvider>
            <AppNavigator />
          </CartProvider>
        </AuthProvider>
      </StripeProvider>
    </SafeAreaProvider>
  )
}
