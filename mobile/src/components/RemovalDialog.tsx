import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from './ui/alert-dialog';
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
      <AlertDialogFooter>
        <AlertDialogCancel className="bg-transparent" style={actionStyle}><Text className="text-center whitespace-normal" style={{ flexShrink: 1 }}>{t('cancel')}</Text></AlertDialogCancel>
        {/* Close only after persistence succeeds so a failed removal can be retried. */}
        <Button variant="destructive" style={actionStyle} onPress={onRemove}><Text className="text-center whitespace-normal" style={{ flexShrink: 1 }}>{actionLabel ?? title}</Text></Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

const actionStyle = { flex: 1, flexShrink: 1, minWidth: 0, minHeight: 48, height: 'auto', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 24 } as const;
