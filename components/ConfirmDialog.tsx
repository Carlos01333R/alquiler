"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  variant?: "destructive" | "default"
  onConfirm?: () => void | Promise<void>
  /** Si es true, solo muestra un botón de cerrar (sin acción destructiva) */
  infoOnly?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  variant = "destructive",
  onConfirm,
  infoOnly = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{description}</div>
          <div className="flex justify-end gap-2 pt-2">
            {infoOnly ? (
              <Button type="button" onClick={() => onOpenChange(false)}>
                Entendido
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  {cancelLabel}
                </Button>
                <button
                   className={`px-4 py-2 rounded-lg text-white cursor-pointer ${
                variant === "destructive" ? "bg-red-500" : "bg-green-500"
              }`}
                  onClick={onConfirm}
                  disabled={loading}
                >
                  {loading ? "Procesando..." : confirmLabel}
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}