import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        source={{ uri: 'https://www.cook4u.london' }}
        style={styles.webview}
        startInLoadingState
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
})
