import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface AppHeaderProps {
  title?: string;
  onProfilePress?: () => void;
}

/**
 * Reusable top header component rendered across all role-specific navigators.
 *
 * Layout:
 * - Left: App logo + "Medi Care" title
 * - Center: Dynamic screen title
 * - Right: Profile avatar button
 *
 * EXTEND: Add notification bell icon with badge count here
 */
export default function AppHeader({
  title = '',
  onProfilePress,
}: AppHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant },
      ]}
    >
      {/* Left — Logo */}
      <View style={styles.left}>
        <Icon
          name="hospital-building"
          size={24}
          color={theme.colors.primary}
        />
        <Text style={[styles.brandText, { color: theme.colors.onSurface }]}>
          Medi Care
        </Text>
      </View>

      {/* Center — Screen title */}
      <View style={styles.center}>
        <Text
          style={[styles.titleText, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* Right — Profile avatar */}
      <TouchableOpacity
        style={styles.right}
        onPress={onProfilePress}
        accessibilityLabel="Open profile panel"
      >
        <Icon
          name="account-circle"
          size={32}
          color={theme.colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    elevation: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  center: {
    flex: 2,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
  },
});
