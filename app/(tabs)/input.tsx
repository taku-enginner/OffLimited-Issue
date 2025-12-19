import { Alert, Button, Text, TextInput, View } from "react-native";
import { useForm, Controller} from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// バリデーションルール定義
const schema = z.object({
    title: z.string().min(1, 'タイトルは１文字以上で入力してください')
})

// z.inferで、Zodのルールから自動的に型を作る
type FormData = z.infer<typeof schema>; // ?


export default function App(){
    //  react hook form セットアップ
    // control: 配線、 handleSubmit:送信時のチェック、 formState:フォームがどんな状態か教えてくれる
    const {control, handleSubmit, formState: {errors}} = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {title: ''}
    })

    // dataは引数、 FormDataはdataの型
    const onSubmit = (data: FormData) => {
        Alert.alert('送信成功', JSON.stringify(data))
    }

    return (
        <View style={{flex: 1, padding: 20, justifyContent: 'center', backgroundColor: "#fff"}}>
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
        </View>
    );
}