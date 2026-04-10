import { Platform, ActionSheetIOS, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

async function requestPermissions() {
  const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
  const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return cameraStatus === 'granted' && libraryStatus === 'granted';
}

// type: 'image' | 'video'
// source: 'camera' | 'library'
async function launchPicker(type, source) {
  const mediaTypes = type === 'video' ? ['videos'] : ['images'];
  const options = { mediaTypes, quality: 0.8 };

  const fn = source === 'camera'
    ? ImagePicker.launchCameraAsync
    : ImagePicker.launchImageLibraryAsync;

  const result = await fn(options);
  return result.canceled ? null : result.assets[0];
}

export async function pickMedia(type) {
  const granted = await requestPermissions();
  if (!granted) {
    Alert.alert('İzin Gerekli', 'Kamera ve galeri erişimine izin vermeniz gerekiyor.');
    return null;
  }

  return new Promise((resolve) => {
    const title = type === 'video' ? 'Video Ekle' : 'Fotoğraf Ekle';

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['İptal', 'Kameradan Çek', 'Galeriden Seç'], cancelButtonIndex: 0 },
        async (idx) => {
          if (idx === 0) return resolve(null);
          resolve(await launchPicker(type, idx === 1 ? 'camera' : 'library'));
        }
      );
    } else {
      Alert.alert(title, 'Kaynak seçin:', [
        { text: 'Kameradan Çek', onPress: async () => resolve(await launchPicker(type, 'camera')) },
        { text: 'Galeriden Seç', onPress: async () => resolve(await launchPicker(type, 'library')) },
        { text: 'İptal', style: 'cancel', onPress: () => resolve(null) },
      ]);
    }
  });
}
