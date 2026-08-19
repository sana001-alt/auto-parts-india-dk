import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, IconButton, Card, Avatar, Text, useTheme } from 'react-native-paper';
import { db, collection, query, orderBy, onSnapshot, addDoc, doc, setDoc } from '../services/firebase';

export default function ChatRoomScreen({ route, user }: any) {
  const { chatId, part } = route.params || {};
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setMessages(list);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatId || !user) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderName: user.displayName || user.email || 'User',
        text: textToSend,
        createdAt: Date.now()
      });

      const chatDocRef = doc(db, 'chats', chatId);
      await setDoc(chatDocRef, {
        id: chatId,
        partTitle: part?.title || part?.partTitle || 'Spare Part',
        lastMessageText: textToSend,
        lastMessageAt: Date.now(),
        lastSenderId: user.uid,
        participants: [user.uid, part?.sellerId || 'seller']
      }, { merge: true });
    } catch (err) {
      console.warn('Error sending message:', err);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.uid;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
        <Text style={isMe ? styles.myText : styles.theirText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
        />

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            mode="outlined"
            style={styles.input}
          />
          <IconButton
            icon="send"
            iconColor="#1565FF"
            size={28}
            onPress={handleSend}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messageList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1565FF',
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
  },
  myText: {
    color: '#FFFFFF',
  },
  theirText: {
    color: '#0B1220',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
  },
});
