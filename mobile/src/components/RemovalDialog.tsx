import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from './ui/alert-dialog';
import { Button } from './ui/button';
import { Text } from './ui/text';
import { t } from '@/i18n';

export function RemovalDialog({ open, onOpenChange, title, description, error, onRemove, actionLabel }: {
  actionLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  error: boolean;
  onRemove: () => void;
}) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent style={{ backgroundColor: "#13151C", borderRadius: 14, padding: 24, gap: 24 }}>
      <AlertDialogTitle className="text-2xl">{title}</AlertDialogTitle>
      <AlertDialogDescription>{description}</AlertDialogDescription>
      {error && <Text accessibilityRole="alert">{t('storageError')}</Text>}
      {/* Keep the dialog open until persistence succeeds so a failed removal can be retried. */}
      <Button variant="destructive" style={{ alignSelf: "center", borderRadius: 24 }} onPress={onRemove}><Text>{actionLabel ?? title}</Text></Button>
      <AlertDialogCancel className="bg-transparent" style={{ alignSelf: "center", minWidth: 140, borderRadius: 24 }}><Text>{t('cancel')}</Text></AlertDialogCancel>
    </AlertDialogContent>
  </AlertDialog>;
}
