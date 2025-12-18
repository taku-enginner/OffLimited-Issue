import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import { Button, View } from 'react-native';

// これが１つの画面として機能する
export default function ProfileScreen() {

    const router = useRouter();
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            <ThemedText type="title">Profile</ThemedText>
            <ThemedText>ここにプロフィール画面の内容を書いていきます。</ThemedText>

            <Button title="モーダルを開く" onPress={() => router.push('/modal')} />
        </View>
    );
}
