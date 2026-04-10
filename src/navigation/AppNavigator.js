import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { COLORS, SHADOWS } from '../config/theme';

import LoginScreen             from '../screens/auth/LoginScreen';
import ForceChangePasswordScreen from '../screens/auth/ForceChangePasswordScreen';
import FeedScreen              from '../screens/feed/FeedScreen';
import EventsScreen            from '../screens/events/EventsScreen';
import EvaluationFormScreen    from '../screens/events/EvaluationFormScreen';
import GalleryScreen           from '../screens/gallery/GalleryScreen';
import LiveScreen              from '../screens/live/LiveScreen';
import AskScreen               from '../screens/ask/AskScreen';
import ProfileScreen           from '../screens/profile/ProfileScreen';
import ChangePasswordScreen    from '../screens/profile/ChangePasswordScreen';
import AdminScreen             from '../screens/admin/AdminScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Tab ikonları ──────────────────────────────────────────────────────────────

const TAB_ICONS = {
  Feed:    { active: 'home',           inactive: 'home-outline'          },
  Gallery: { active: 'images',         inactive: 'images-outline'        },
  Ask:     { active: 'leaf',           inactive: 'leaf-outline'          }, // merkez
  Events:  { active: 'calendar',       inactive: 'calendar-outline'      },
  Profile: { active: 'person',         inactive: 'person-circle-outline' },
};

// ── Özel Tab Bar (Postly stili) ───────────────────────────────────────────────

function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const TAB_LABELS = {
    Feed:    t('tabs.feed'),
    Events:  t('tabs.events'),
    Gallery: t('tabs.gallery'),
    Ask:     'Uzmana Sor',
    Profile: t('tabs.profile'),
  };

  return (
    <View style={[tabStyles.wrapper, { paddingBottom: insets.bottom || 10 }]}>
      <View style={[tabStyles.bar, SHADOWS.tabBar]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter  = index === 2; // Ask — merkez butonu
          const icons     = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          const iconName  = isFocused ? icons.active : icons.inactive;
          const label     = TAB_LABELS[route.name] || route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // ── Merkez butonu ──────────────────────────────────────────────────
          if (isCenter) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={tabStyles.centerWrapper}
                activeOpacity={0.85}
              >
                <View style={[tabStyles.centerCircle, isFocused && tabStyles.centerCircleActive, SHADOWS.button]}>
                  <Ionicons name={iconName} size={26} color={COLORS.white} />
                </View>
                <Text style={[tabStyles.centerLabel, isFocused && tabStyles.centerLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }

          // ── Normal tab ────────────────────────────────────────────────────
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tabStyles.tab}
              activeOpacity={0.7}
            >
              <View style={[tabStyles.iconWrap, isFocused && tabStyles.iconWrapActive]}>
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? COLORS.tabActive : COLORS.tabInactive}
                />
              </View>
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Ana Tab Navigator ─────────────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Feed"    component={FeedScreen}    />
      <Tab.Screen name="Gallery" component={GalleryScreen} />
      <Tab.Screen name="Ask"     component={AskScreen}     />
      <Tab.Screen name="Events"  component={EventsScreen}  />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Stack Navigator ───────────────────────────────────────────────────────────

const headerStyle = {
  headerTintColor: COLORS.primaryMid,
  headerBackTitle: 'Geri',
  headerStyle: { backgroundColor: COLORS.background, elevation: 0, shadowOpacity: 0 },
  headerTitleStyle: { fontWeight: '700', color: COLORS.primary },
};

export default function AppNavigator() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !profile?.passwordChanged ? (
          <Stack.Screen name="ForceChangePassword" component={ForceChangePasswordScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: true, title: 'Şifre Değiştir', ...headerStyle }}
            />
            <Stack.Screen
              name="EvaluationForm"
              component={EvaluationFormScreen}
              options={{ headerShown: true, title: 'Etkinlik Değerlendirmesi', ...headerStyle }}
            />
            <Stack.Screen
              name="Admin"
              component={AdminScreen}
              options={{ headerShown: true, title: 'Admin Paneli', ...headerStyle }}
            />
            <Stack.Screen
              name="Live"
              component={LiveScreen}
              options={{ headerShown: true, title: 'Sahadan Canlı', ...headerStyle }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const tabStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.tabBg,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 8,
    ...SHADOWS.tabBar,
  },

  // Normal tab
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  iconWrap: {
    width: 40, height: 32,
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: COLORS.primaryPale,
  },
  label: {
    fontSize: 10,
    color: COLORS.tabInactive,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.tabActive,
    fontWeight: '700',
  },

  // Merkez butonu
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 4,
    gap: 3,
    marginTop: -20,
  },
  centerCircle: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryMid,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.tabBg,
  },
  centerCircleActive: {
    backgroundColor: COLORS.primary,
  },
  centerLabel: {
    fontSize: 10,
    color: COLORS.tabInactive,
    fontWeight: '500',
  },
  centerLabelActive: {
    color: COLORS.tabActive,
    fontWeight: '700',
  },
});
