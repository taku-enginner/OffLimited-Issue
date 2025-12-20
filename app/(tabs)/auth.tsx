import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest} from 'expo-auth-session';
import { Button, View, Text, Alert } from 'react-native';

// ブラウザのセッションを管理する設定
WebBrowser.maybeCompleteAuthSession();

// GitHubのエンドポイント設定
const discovery = {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    revocationEndpoint: 'https://github.com/settings/connections/applications/Ov23li7qATNiA4Kef3nv',
};

export default function App(){
    const [accessToken, setAccessToken] = React.useState<string | null>(null);

    // 認証リクエストの作成
    const [request, response, promptAsync] = useAuthRequest(
        {
            clientId: 'Ov23li7qATNiA4Kef3nv',
            scopes: ['repo', 'user'],
            redirectUri: makeRedirectUri({
                scheme: 'exp+offlimitedissue',
            }),
        },
        discovery
    );

    //認証レスポンスの処理
    React.useEffect(() => {
        if (response?.type === 'success'){
            const {code} = response.params;
            console.log('Authorization Code:', code);
            setAccessToken(code);
            Alert.alert("ログイン成功", "認可コードを取得しました");
        }
    }, [response]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 20}}>
            {accessToken ? (
                <Text>認証コード取得済み。これでIssueが作れます！</Text>
            ) : (
                <Button
                    disabled={!request}
                    title="GitHubでログイン"
                    onPress={() => {
                        promptAsync()
                    }}
                />
            )}
        </View>
    );
}