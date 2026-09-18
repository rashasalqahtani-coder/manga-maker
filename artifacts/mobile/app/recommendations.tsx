import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';

export default function UserRecommendationsScreen() {
  // قائمة الترشيحات (تبدأ بترشيحات افتراضية ويمكن للمستخدمين إضافة المزيد)
  const [recommendations, setRecommendations] = useState([
    {
      id: '1',
      author: 'قارئ مخضرم',
      mangaTitle: 'ون بيس (One Piece)',
      targetManga: 'ناروتو',
      reason: 'كلاهما يتكلم عن المغامرات الكبرى، قوة الصداقة، والقصص الدرامية للشخصيات.'
    }
  ]);

  // حالات حقول الإدخال
  const [authorName, setAuthorName] = useState('');
  const [mangaTitle, setMangaTitle] = useState('');
  const [targetManga, setTargetManga] = useState('');
  const [reason, setReason] = useState('');

  // دالة إضافة ترشيح جديد
  const handleAddRecommendation = () => {
    if (!authorName.trim() || !mangaTitle.trim() || !targetManga.trim() || !reason.trim()) {
      Alert.alert("تنبيه", "الرجاء تعبئة جميع الحقول قبل إرسال الترشيح!");
      return;
    }

    const newRec = {
      id: Date.now().toString(),
      author: authorName,
      mangaTitle: mangaTitle,
      targetManga: targetManga,
      reason: reason
    };

    setRecommendations((prev) => [newRec, ...prev]);
    
    // تفريغ الحقول بعد الإرسال
    setAuthorName('');
    setMangaTitle('');
    setTargetManga('');
    setReason('');
    
    Alert.alert("شكراً لك! 🌟", "تم نشر ترشيحك بنجاح ليراه باقي القراء.");
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>🤝 ترشيحات المجتمع</Text>
      <Text style={styles.headerSubtitle}>شارك القراء الآخرين بأفضل مانجا تابعتها والسبب وراء ترشيحك لها.</Text>

      {/* نموذج إضافة ترشيح جديد */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>أضف ترشيحك الجديد</Text>
        
        <TextInput
          style={styles.input}
          placeholder="اسمك المستعار..."
          placeholderTextColor="#888"
          value={authorName}
          onChangeText={setAuthorName}
        />

        <TextInput
          style={styles.input}
          placeholder="المانجا المقترحة (مثال: ون بيس)..."
          placeholderTextColor="#888"
          value={mangaTitle}
          onChangeText={setMangaTitle}
        />

        <TextInput
          style={styles.input}
          placeholder="مشابهة لـ (مثال: ناروتو)..."
          placeholderTextColor="#888"
          value={targetManga}
          onChangeText={setTargetManga}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="السبب (مثال: كلاهما يتكلم عن المغامرات والصداقة...)"
          placeholderTextColor="#888"
          multiline
          value={reason}
          onChangeText={setReason}
        />

        <TouchableOpacity style={styles.button} onPress={handleAddRecommendation}>
          <Text style={styles.buttonText}>نشر الترشيح</Text>
        </TouchableOpacity>
      </View>

      {/* قائمة عرض ترشيحات المستخدمين */}
      <Text style={styles.sectionTitle}>💬 ترشيحات القراء الآخرين</Text>
      
      {recommendations.map((item) => (
        <View key={item.id} style={styles.recCard}>
          <View style={styles.recHeader}>
            <Text style={styles.mangaName}>{item.mangaTitle}</Text>
            <Text style={styles.badge}>بديل لـ {item.targetManga}</Text>
          </View>
          
          <Text style={styles.reasonText}>
            <Text style={styles.boldText}>السبب: </Text>
            {item.reason}
          </Text>

          <Text style={styles.authorText}>بواسطة: {item.author}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#121212',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 5,
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#333',
  },
  formTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#444',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'right',
  },
  recCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderRightWidth: 4,
    borderRightColor: '#6366f1',
  },
  recHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mangaName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    color: '#818cf8',
    fontSize: 11,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  reasonText: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 10,
  },
  boldText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  authorText: {
    color: '#777',
    fontSize: 11,
    textAlign: 'right',
  },
});