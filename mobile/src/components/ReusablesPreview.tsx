import { useState } from 'react';
import { View } from 'react-native';
import { Button } from './ui/button';
import { Text } from './ui/text';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { RemovalDialog } from './RemovalDialog';

export function ReusablesPreview() {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState('default');
  return <Card>
    <CardHeader><CardTitle className="font-heading">React Native Reusables</CardTitle>
      <Text className="text-muted-foreground text-sm">Crimson actions · Inter UI · Jakarta headings</Text>
    </CardHeader>
    <CardContent className="gap-4">
      <View className="flex-row flex-wrap gap-2">
        <Badge><Text>Primary</Text></Badge><Badge variant="secondary"><Text>Secondary</Text></Badge>
        <Badge variant="outline"><Text>Outline</Text></Badge>
      </View>
      <Separator />
      {(['default', 'secondary', 'outline', 'ghost'] as const).map(value => <Button key={value}
        variant={value} onPress={() => setVariant(value)}><Text>{value}</Text></Button>)}
      <Text className="text-sm text-muted-foreground">Selected: {variant}</Text>
      <Button variant="outline" onPress={() => setOpen(true)}><Text>Preview removal dialog</Text></Button>
      <RemovalDialog open={open} onOpenChange={setOpen} title="Remove preview?" description="This preview does not change your saved titles."
        error={false} onRemove={() => setOpen(false)} />
    </CardContent>
  </Card>;
}
