import { Alert, Button, Text, TextInput, View, FlatList, TouchableOpacity } from "react-native";
import { useSafeAreaInsets} from 'react-native-safe-area-context';
import { useForm, Controller} from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React, {useState, useEffect} from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    revocationEndpoint: 'https://github.com/settings/connections/applications/Ov23li7qATNiA4Kef3nv',
};

// バリデーションルール定義
const schema = z.object({
    owner: z.string().min(1, 'リポジトリ名は１文字以上で入力してください'),
    repo: z.string().min(1, 'issueタイトルは１文字以上で入力してください'),
    title: z.string().min(1, 'タイトルは１文字以上で入力してください')
})

// z.inferで、Zodのルールから自動的に型を作る
type FormData = z.infer<typeof schema>; // ?

export default function App(){
    const insets = useSafeAreaInsets();
    const [history, setHistory] = useState<string[]>([]);

    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [request, response, promptAsync] = useAuthRequest(
        {
            clientId: 'Ov23li7qATNiA4Kef3nv',
            scopes: ['repo', 'user'],
            usePKCE: false,
            redirectUri: makeRedirectUri({
                scheme: 'exp+offlimitedissue',
                path: 'callback',
            }),
        },
        discovery
    );

    // 認証レスポンス監視
    useEffect(() => {
        if (response?.type === 'success' && !accessToken) {
            const { code } = response.params;
            exchangeCodeForToken(code);
        }
    }, [response]);

    // トークン交換
    const exchangeCodeForToken = async (code: string) => {
        try {
            const res = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: 'Ov23li7qATNiA4Kef3nv',
                    client_secret: process.env.EXPO_PUBLIC_GITHUB_CLIENT_SECRET, // ★ここに貼り付け
                    code: code,
                }),
            });
            const data = await res.json();
            if (data.access_token) {
                setAccessToken(data.access_token);
                Alert.alert("認証成功", "GitHub連携が完了しました");
            }
        } catch (e) {
            Alert.alert("エラー", "認証に失敗しました");
        }
    };

    const createGitHubIssue = async (title: string) => {
        if (!accessToken) {
            Alert.alert("エラー", "先にGitHubログインをしてください");
            return;
        }
        const {owner, repo} = getValues();
        setLoading(true);
        try {
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: title, body: 'Appから送信' }),
            });
            if (res.ok) {
                Alert.alert("成功", "GitHubにIssueを作成しました！");
            } else {
                Alert.alert("失敗", "Issueの作成に失敗しました");
            }
        } catch (e) {
            Alert.alert("エラー", "通信失敗");
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    //  react hook form セットアップ
    // control: 配線、 handleSubmit:送信時のチェック、 formState:フォームがどんな状態か教えてくれる
    // getValues を追加
    const { control, handleSubmit, reset, getValues, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            owner: '',
            repo: '',
            title: ''
        }
    });
    // 初回データの読み込み
    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const saved = await AsyncStorage.getItem('@history_list');
        if (saved) {
            setHistory(JSON.parse(saved)); // 文字列を配列に戻す
        }
    }

    const onSave = async (data: FormData) => {
        const newHistory = [data.title, ...history];
        setHistory(newHistory);

        await AsyncStorage.setItem('@history_list', JSON.stringify(newHistory));
        setValue('title', '');
    };

    const confirmDelete = (index: number) => {
        Alert.alert(
            "確認",
            "この項目を削除してもよろしいですか？",
            [
                {text: "キャンセル", style: "cancel"},
                {text: "削除", style: "destructive", onPress: () => deleteItem(index)}
            ]
        )
    }
    const deleteItem = async (index: number) => {
        const newHistory = history.filter((_,i) => i !== index);

        setHistory(newHistory);
        await AsyncStorage.setItem('@histry_list', JSON.stringify(newHistory));
    }

    const onGitHubSubmit = async () => {
        if (!accessToken) {
            Alert.alert("認証が必要", "まずGitHubでログインしてください");
            return;
        }
    
        if (history.length === 0) {
            Alert.alert("データなし", "送信する項目がありません");
            return;
        }
    
        setLoading(true);
    
        try {
            // 全ての項目を順番に送信（Promise.allで並列実行も可能ですが、安全に一つずつ）
            for (const title of history) {
                await createGitHubIssue(title);
            }
    
            Alert.alert("送信完了", `${history.length}件のIssueを作成しました`);
    
            // 送信が終わったらリストを空にする（任意）
            setHistory([]);
            await AsyncStorage.removeItem('@history_list');
            
        } catch (e) {
            Alert.alert("エラー", "一部または全ての送信に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[{flex: 1, padding: 20, justifyContent: 'center', backgroundColor: "#fff"},{paddingTop: insets.top + 20}]}>
            <Text style={{fontSize: 16, marginBottom: 8, fontWeight: 'bold'}}>オーナー名</Text>
            <Controller
                control={control}
                name="owner"
                // onBlur:入力欄から離れた瞬間にバリデーションをするためのもの
                render={({field: {onChange, onBlur, value}}) => (
                    <TextInput
                    // エラーがある時に枠を赤くする→条件分岐。配列形式。配列を使うと、後ろの要素が優先されるので、エラーがある時はff4444が見えるようになる
                    // 三項演算子でもかける
                        style={[{height:50, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 15, marginBottom: 20},
                             errors.title && {borderColor:"#ff4444"}]}
                        placeholder="オーナー名を入力してください"
                        onBlur={onBlur}
                        value={value} // renderでvalueという引数を取り出している。それを使う。
                        onChangeText={onChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                    />
                )}
            />
            <Text style={{fontSize: 16, marginBottom: 8, fontWeight: 'bold'}}>リポジトリ名</Text>
            <Controller
                control={control}
                name="repo"
                // onBlur:入力欄から離れた瞬間にバリデーションをするためのもの
                render={({field: {onChange, onBlur, value}}) => (
                    <TextInput
                    // エラーがある時に枠を赤くする→条件分岐。配列形式。配列を使うと、後ろの要素が優先されるので、エラーがある時はff4444が見えるようになる
                    // 三項演算子でもかける
                        style={[{height:50, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 15, marginBottom: 20},
                             errors.title && {borderColor:"#ff4444"}]}
                        placeholder="リポジトリ名を入力してください"
                        onBlur={onBlur}
                        value={value} // renderでvalueという引数を取り出している。それを使う。
                        onChangeText={onChange}
                        autoCapitalize="none"      
                        autoCorrect={false}
                        spellCheck={false}
                    />
                )}
            />
            <Text style={{fontSize: 16, marginBottom: 8, fontWeight: 'bold'}}>issueタイトル</Text>
            <Controller
                control={control}
                name="title"
                // onBlur:入力欄から離れた瞬間にバリデーションをするためのもの
                render={({field: {onChange, onBlur, value}}) => (
                    <TextInput
                    // エラーがある時に枠を赤くする→条件分岐。配列形式。配列を使うと、後ろの要素が優先されるので、エラーがある時はff4444が見えるようになる
                    // 三項演算子でもかける
                        style={[{height:50, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 15, marginBottom: 20},
                             errors.title && {borderColor:"#ff4444"}]}
                        placeholder="issueタイトルを入力してください"
                        onBlur={onBlur}
                        value={value} // renderでvalueという引数を取り出している。それを使う。
                        onChangeText={onChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                    />
                )}
            />
            <View style={{marginTop: 10}}>
                {/* handleSubmit(onSubmit)はなに？ */}
                <Button title="保存" onPress={handleSubmit(onSave)} /> 
                <Button 
                    title="ログアウト（初期化）" 
                    onPress={() => {
                        setAccessToken(null); // トークンを空にする
                        Alert.alert("ログアウト", "認証情報をクリアしました。");
                    }} 
                    color="#ff4444" 
                />
            </View>
            <View style={{ marginTop: 10, padding: 5, backgroundColor: accessToken ? '#f0fff0' : '#fff' }}>
                {!(accessToken) ? (
                    <Button title="GitHubでログイン" onPress={() => promptAsync()} color="#24292e" />
                ) : (
                    history.length > 0 && (
                        <TouchableOpacity 
                            style={{ 
                                backgroundColor: '#2ea44f', 
                                padding: 15, 
                                borderRadius: 8, 
                                marginTop: 20,
                                alignItems: 'center' 
                            }}
                            onPress={onGitHubSubmit}
                            disabled={loading}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                {loading ? "送信中..." : `${history.length}件をGitHubに一括送信`}
                            </Text>
                        </TouchableOpacity>
                    )
                )}
            </View>

            <Text style={{fontSize: 18, fontWeight: 'bold', marginTop: 30, marginBottom: 10}}>下書き一覧</Text>

            <FlatList
                data={history}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({item, index}) => (
                    <View style={{padding: 15, borderBottomWidth: 1, borderBottomColor: "#eee", flexDirection: "row", justifyContent: "space-between", alignItems: "center"}}>
                        <Text style={{fontSize: 16, flex: 1}}>{item}</Text>

                        <TouchableOpacity
                            style={{padding: 5, marginLeft: 10, }}
                            onPress={()=> confirmDelete(index)}
                        >
                            <Text style={{ color: "#ff4444", fontWeight: "bold"}}>削除</Text>

                        </TouchableOpacity>
                    </View>
                )}
            ></FlatList>
        </View>
    );
}