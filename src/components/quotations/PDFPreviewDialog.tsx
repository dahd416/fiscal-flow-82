import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PDFPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  htmlContent: string;
  quotationNumber: string;
}

export function PDFPreviewDialog({
  open,
  onClose,
  htmlContent,
  quotationNumber,
}: PDFPreviewDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && htmlContent) {
      setLoading(true);
      
      // Small delay to ensure iframe is mounted
      const timer = setTimeout(() => {
        const iframe = iframeRef.current;
        if (iframe) {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            
            if (doc) {
              doc.open();
              doc.write(htmlContent);
              doc.close();
              
              // Wait for content to render
              setTimeout(() => {
                setLoading(false);
              }, 300);
            }
          } catch (error) {
            console.error('Error loading PDF preview:', error);
            setLoading(false);
            toast.error('Error al cargar la vista previa');
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [open, htmlContent]);

  const handleDownloadPDF = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.print();
        toast.success('Abre el diálogo de impresión y selecciona "Guardar como PDF"');
      } catch (error) {
        console.error('Error printing:', error);
        toast.error('Error al generar PDF');
      }
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.loading('Generando PDF...');
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
      if (!doc) throw new Error('Documento no disponible');
      const element = doc.body as HTMLElement;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'pt', 'letter');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Cotizacion_${quotationNumber || 'archivo'}.pdf`);
      toast.dismiss();
      toast.success('PDF descargado');
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.dismiss();
      toast.error('No se pudo descargar el PDF');
    }
  };
  const handleClose = () => {
    setLoading(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Vista Previa de Cotización</DialogTitle>
              <DialogDescription>
                {quotationNumber}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Imprimir / Guardar
              </Button>
              <Button
                onClick={handleExportPDF}
                variant="default"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
              <Button
                onClick={handleClose}
                variant="ghost"
                size="icon"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative overflow-hidden bg-muted/30">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando vista previa...</p>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0 bg-white"
            title="PDF Preview"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
