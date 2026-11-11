import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from './ui/alert-dialog';
import { Button } from './ui/button';
import { Text } from './ui/text';
import { t } from '@/i18n';

export function RemovalDialog({ open, onOpenChange, title, description, error, onRemove }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  error: boolean;
  onRemove: () => void;
}) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>{description}</AlertDialogDescription>
      {error && <Text accessibilityRole="alert">{t('storageError')}</Text>}
      {/* Keep the dialog open until persistence succeeds so a failed removal can be retried. */}
      <Button variant="destructive" onPress={onRemove}><Text>{title}</Text></Button>
      <AlertDialogCancel><Text>{t('cancel')}</Text></AlertDialogCancel>
    </AlertDialogContent>
  </AlertDialog>;
}
