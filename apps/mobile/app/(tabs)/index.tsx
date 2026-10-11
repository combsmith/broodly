import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Heading } from '../../components/ui/heading';
import { Text } from '../../components/ui/text';
import { Button, ButtonText } from '../../components/ui/button';
import { useAuthStore } from '../../src/store/auth-store';
import { ICON_COLORS } from '../../src/theme/colors';

function ContextCard({
  icon,
  title,
  value,
  updatedAt,
  bgClass,
}: {
  icon: string;
  title: string;
  value: string;
  updatedAt?: string;
  bgClass: string;
}) {
  return (
    <View className={`${bgClass} rounded-xl p-4 mb-3`}>
      <View className="flex-row items-center gap-2 mb-1">
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={ICON_COLORS.muted} />
        <Text size="xs" className="text-typography-400">{title}</Text>
      </View>
      <Text size="md" className="font-medium">{value}</Text>
      {updatedAt && (
        <Text size="xs" className="text-typography-400 mt-1">{updatedAt}</Text>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const displayName = useAuthStore((s) => s.user?.displayName);
  const greeting = displayName ? `Hello, ${displayName}` : 'Welcome back';

  return (
    <ScrollView
      className="flex-1 bg-background-50"
      contentContainerClassName="px-4 pt-6 pb-12"
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
    >
      <Heading size="2xl" className="mb-1">{greeting}</Heading>
      <Text size="md" className="text-typography-500 mb-6">
        Here's what matters today
      </Text>

      {/* Context cards — live data wired in Story 10.4 */}
      <ContextCard
        icon="partly-sunny-outline"
        title="Weather"
        value="Weather data coming soon"
        bgClass="bg-background-info"
      />
      <ContextCard
        icon="flower-outline"
        title="Bloom Status"
        value="Bloom tracking coming soon"
        bgClass="bg-background-success"
      />
      <ContextCard
        icon="calendar-outline"
        title="Seasonal Phase"
        value="Seasonal context coming soon"
        bgClass="bg-background-warning"
      />

      {/* Primary CTAs */}
      <View className="gap-3 mt-4">
        <Button
          action="primary"
          variant="solid"
          size="xl"
          onPress={() => router.push('/(tabs)/plan')}
          accessibilityLabel="Start today's plan"
          testID="start-plan-btn"
        >
          <ButtonText>Start Today's Plan</ButtonText>
        </Button>
        <Button
          action="primary"
          variant="outline"
          size="xl"
          onPress={() => router.push('/(tabs)/apiaries')}
          accessibilityLabel="View my apiaries"
          testID="view-apiaries-btn"
        >
          <ButtonText>View My Apiaries</ButtonText>
        </Button>
      </View>
    </ScrollView>
  );
}
