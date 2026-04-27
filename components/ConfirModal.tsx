import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Plus,
  Trash2,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  Edit,
  Download,
  FileText,
  Upload,
  Eye,
  User,
  Users,
  Package,
  Wrench,
  Hammer,
  ShoppingCart,
  AlertTriangle,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  loading?: boolean
}

function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading,
}: ConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-x-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <button
            className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-x-1 cursor-pointer"
            onClick={onConfirm}
            disabled={loading}
          >
           <p className="text-white">  {loading ? "Eliminando..." : "Sí, eliminar"}</p>
          
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmModal