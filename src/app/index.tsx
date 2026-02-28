import { View, Text, Button } from 'react-native';
import { router } from 'expo-router';

export default function Home() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>LifeSync Initial Screen</Text>
            <Button title="Go to Today" onPress={() => router.push('/today')} />
        </View>
    );
}
