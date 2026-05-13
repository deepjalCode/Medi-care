import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { InAppNotification } from '../context/NotificationContext';

interface Props {
  notification: InAppNotification | null;
  onDismiss: () => void;
}

const BANNER_DURATION = 4000; // 4 seconds


export default function InAppNotificationBanner({
  notification,
  onDismiss,
}: Props) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (notification) {
      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();

      // Auto-dismiss after BANNER_DURATION
      timerRef.current = setTimeout(() => {
        dismiss();
      }, BANNER_DURATION);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!notification) return null;

  // Derive a title/body from the message string (format: "Title: body")
  const colonIdx = notification.message.indexOf(': ');
  const bannerTitle = colonIdx > -1
    ? notification.message.slice(0, colonIdx)
    : 'Notification';
  const bannerBody = colonIdx > -1
    ? notification.message.slice(colonIdx + 2)
    : notification.message;

  return (
    <TouchableWithoutFeedback onPress={dismiss}>
      <Animated.View
        style={[styles.container, { transform: [{ translateY }] }]}
      >
        <View style={styles.content}>
          <Icon name="bell-ring-outline" size={24} color="#fff" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {bannerTitle}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {bannerBody}
            </Text>
          </View>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 10,
    paddingTop: 44, // Safe area for status bar
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#5c6bc0',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  body: {
    color: '#e8eaf6',
    fontSize: 13,
    marginTop: 2,
  },
});
