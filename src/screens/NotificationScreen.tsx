/**
 * NotificationScreen
 *
 * Full-page notification list used as a modal bottom sheet.
 * Displayed when user taps the bell icon in AppHeader.
 * Reads from NotificationContext — no network calls.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNotificationContext, InAppNotification } from '../context/NotificationContext';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface NotificationScreenProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function NotificationScreen({
  visible,
  onClose,
}: NotificationScreenProps) {
  const theme = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotificationContext();

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // ── Render Item ────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: InAppNotification }) => (
    <TouchableOpacity
      style={[
        styles.notifItem,
        !item.read && styles.notifItemUnread,
      ]}
      onPress={() => markRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.notifIconWrap}>
        <Icon
          name={item.read ? 'bell-outline' : 'bell-ring'}
          size={20}
          color={item.read ? '#888' : theme.colors.primary}
        />
      </View>
      <View style={styles.notifContent}>
        <Text
          style={[
            styles.notifMessage,
            !item.read && styles.notifMessageUnread,
          ]}
          numberOfLines={3}
        >
          {item.message}
        </Text>
        <Text style={styles.notifTime}>{formatTime(item.timestamp)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  // ── Empty State ────────────────────────────────────────────────────────────

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="bell-sleep-outline" size={56} color="#ccc" />
      <Text style={styles.emptyText}>No notifications yet</Text>
      <Text style={styles.emptySubtext}>
        You'll see updates about your appointments here.
      </Text>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="Close notifications"
          >
            <Icon name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Notifications
          </Text>
          {unreadCount > 0 ? (
            <Button
              onPress={markAllRead}
              compact
              mode="text"
              labelStyle={styles.markAllLabel}
            >
              Mark all read
            </Button>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* Unread count chip */}
        {unreadCount > 0 && (
          <View style={styles.unreadBanner}>
            <Icon name="bell-alert" size={14} color="#fff" />
            <Text style={styles.unreadBannerText}>
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* List */}
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={
            notifications.length === 0 ? styles.flatListEmpty : styles.flatListContent
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  closeBtn: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerSpacer: {
    width: 100,
  },
  markAllLabel: {
    fontSize: 12,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5c6bc0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  unreadBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  flatListContent: {
    paddingBottom: 24,
  },
  flatListEmpty: {
    flex: 1,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  notifItemUnread: {
    backgroundColor: '#f0f4ff',
  },
  notifIconWrap: {
    marginRight: 12,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  notifMessageUnread: {
    color: '#1a1a2e',
    fontWeight: '600',
  },
  notifTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e53935',
    marginTop: 6,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
