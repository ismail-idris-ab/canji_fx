import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Text } from 'react-native';

/**
 * Two tabs for now. News and Alerts arrive with their own slices, and the
 * admin area never appears here at all — it is a hidden route reached by
 * long-pressing the logo.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#15151C',
          borderTopColor: '#2A2A35',
        },
        tabBarActiveTintColor: '#F5B301',
        tabBarInactiveTintColor: '#8A8A99',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: '#0B0B0F' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Rates',
          tabBarIcon: ({ color }) => <TabGlyph color={color}>₦</TabGlyph>,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'News',
          tabBarIcon: ({ color }) => <TabGlyph color={color}>◫</TabGlyph>,
        }}
      />
      <Tabs.Screen
        name="convert"
        options={{
          title: 'Convert',
          tabBarIcon: ({ color }) => <TabGlyph color={color}>⇄</TabGlyph>,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <TabGlyph color={color}>◔</TabGlyph>,
        }}
      />
    </Tabs>
  );
}

function TabGlyph({
  color,
  children,
}: {
  color: ColorValue;
  children: React.ReactNode;
}) {
  return (
    <Text style={{ color, fontSize: 18, lineHeight: 22 }}>{children}</Text>
  );
}
