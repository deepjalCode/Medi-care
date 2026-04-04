/**
 * AppHeader (v2.0)
 *
 * Changes from v1:
 * - Added notification bell icon with red badge (Feature 3)
 * - Bell is hidden for Admin (showNotificationBell defaults to false)
 * - Accepts unreadCount and onNotificationPress props
 *
 * Layout (left → right):
 *   [ Hospital Icon | "Medi Care" ] .... [ Screen Title ] .... [ Bell* | Profile Avatar ]
 *
 * * Bell visible only when showNotificationBell={true}
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  title?: string;
  onProfilePress?: () => void;
  /** Show notification bell — hidden for Admin, visible for Doctor/Patient */
  showNotificationBell?: boolean;
  /** Badge count on bell — shown when > 0 */
  unreadCount?: number;
  /** Called when bell icon is tapped */
  onNotificationPress?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AppHeader({
  title = '',
  onProfilePress,
  showNotificationBell = false,
  unreadCount = 0,
  onNotificationPress,
}: AppHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant },
      ]}
    >
      {/* Left — Logo + Brand */}
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

      {/* Right — Notification Bell (optional) + Profile Avatar */}
      <View style={styles.right}>
        {/* --- ADDED: Notification Bell (Feature 3) --- */}
        {showNotificationBell && (
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={onNotificationPress}
            accessibilityLabel="Open notifications"
          >
            <Icon
              name={unreadCount > 0 ? 'bell-badge' : 'bell-outline'}
              size={26}
              color={unreadCount > 0 ? '#e53935' : theme.colors.onSurface}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {/* --- END ADDED --- */}

        {/* Profile Avatar */}
        <TouchableOpacity
          style={styles.profileBtn}
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
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // slightly increased horizontal too
    paddingVertical: 18, // Increased vertical padding
    borderBottomWidth: 1,
    elevation: 2,
    height: 72, // Increased header height
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bellBtn: {
    position: 'relative',
    marginRight: 6,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  profileBtn: {
    padding: 4,
  },
});
