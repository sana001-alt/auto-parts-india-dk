import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { List, Text, Badge, Divider, useTheme } from 'react-native-paper';
import { db, collection, query, where, onSnapshot } from '../services/firebase';
import { DEFAULT_AVATAR } from '../constants';

export default function ChatsScreen({ navigation, user }: any) {
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setChats(list);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text variant="titleMedium" style={styles.text}>Sign in to view your conversations</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderChatItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, part: { title: item.partTitle } })}
    >
      <List.Item
        title={item.partTitle || 'Spare Part Discussion'}
        description={item.lastMessageText || 'Tap to open chat'}
        left={() => (
          <Image 
            source={{ uri: item.partImageUrl || DEFAULT_AVATAR }} 
            style={styles.avatar}
            resizeMode="cover"
          />
        )}
        right={(props) => (
          <View style={styles.rightContainer}>
            <Text variant="bodySmall" style={styles.timeText}>
              {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
        )}
      />
      <Divider />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text variant="bodyMedium" style={styles.text}>No active chat conversations yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#64748B',
  },
  rightContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  timeText: {
    color: '#94A3B8',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    padding: 0,
    margin: 0,
    marginRight: 12,
  },
});
