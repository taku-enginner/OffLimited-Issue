import { Alert, Button, Text, TextInput, View, FlatList, TouchableOpacity } from "react-native";
import { useSafeAreaInsets} from 'react-native-safe-area-context';
import { useForm, Controller} from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React, {useState, useEffect} from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

// バリデーションルール定義
const schema = z.object({
    title: z.string().min(1, 'タイトルは１文字以上で入力してください')
})

// z.inferで、Zodのルールから自動的に型を作る
type FormData = z.infer<typeof schema>; // ?

export default function App(){
    const insets = useSafeAreaInsets();
    const [history, setHistory] = useState<string[]>([]);

    //  react hook form セットアップ
    // control: 配線、 handleSubmit:送信時のチェック、 formState:フォームがどんな状態か教えてくれる
    const {control, handleSubmit, reset, setValue, formState: {errors}} = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {title: ''}
    })

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

    const onSubmit = async (data: FormData) => {
        const newHistory = [data.title, ...history];
        setHistory(newHistory);

        await AsyncStorage.setItem('@history_list', JSON.stringify(newHistory));
        reset(); // 入力欄を空にする
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

    return (
        <View style={[{flex: 1, padding: 20, justifyContent: 'center', backgroundColor: "#fff"},{paddingTop: insets.top + 20}]}>
            <Text style={{fontSize: 16, marginBottom: 8, fontWeight: 'bold'}}>タイトル</Text>
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
                    />
                )}
            />
            <View style={{marginTop: 10}}>
                {/* handleSubmit(onSubmit)はなに？ */}
                <Button title="保存" onPress={handleSubmit(onSubmit)} /> 
            </View>

            <Text style={{fontSize: 18, fontWeight: 'bold', marginTop: 30, marginBottom: 10}}>保存済み一覧</Text>

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