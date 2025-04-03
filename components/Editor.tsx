import React, { useState, useEffect, forwardRef } from 'react'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Heading1, 
  Heading2, 
  Heading3, 
  Quote, 
  Link, 
  Image, 
  Undo, 
  Redo,
  Code,
  Divide
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface EditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  minHeight?: string
  maxHeight?: string
  disabled?: boolean
}

export const Editor = forwardRef<HTMLDivElement, EditorProps>(
  ({ value, onChange, className, placeholder, minHeight = '300px', maxHeight = '600px', disabled = false }, ref) => {
    const [editorContent, setEditorContent] = useState('')
    const [showLinkPopover, setShowLinkPopover] = useState(false)
    const [linkUrl, setLinkUrl] = useState('')
    const [linkText, setLinkText] = useState('')
    const [showImagePopover, setShowImagePopover] = useState(false)
    const [imageUrl, setImageUrl] = useState('')
    const [imageAlt, setImageAlt] = useState('')
    const editorRef = React.useRef<HTMLDivElement>(null)

    // Sync external value prop with editor content
    useEffect(() => {
        // Only update if the external value is defined, the ref exists,
        // and the external value is different from the current editor content.
        // This prevents resetting the editor on every parent re-render if the value hasn't actually changed.
        if (value !== undefined && editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
        // Ensure initial empty state is set if value is initially empty
        else if (value === '' && editorRef.current && editorRef.current.innerHTML !== '') {
             editorRef.current.innerHTML = '';
        }
    }, [value]); // Depend only on the external value prop

    // İçerik değiştiğinde dışarıyı bilgilendir
    const handleContentChange = (content: string) => {
      // onChange'i doğrudan çağır, internal state'e belki gerek yok
      onChange(content)
    }

    // Düzenleyici içeriğini güncelle
    const updateContent = () => {
      if (editorRef.current) {
        const currentContent = editorRef.current.innerHTML;
        handleContentChange(currentContent);
      }
    }

    // Metin düzenleme komutları
    const execCommand = (command: string, value: string = '') => {
      if (disabled) return
      document.execCommand(command, false, value)
      updateContent()
      editorRef.current?.focus()
    }

    // Biçimlendirme fonksiyonları
    const formatBold = () => execCommand('bold')
    const formatItalic = () => execCommand('italic')
    const formatUnorderedList = () => execCommand('insertUnorderedList')
    const formatOrderedList = () => execCommand('insertOrderedList')
    const formatAlignLeft = () => execCommand('justifyLeft')
    const formatAlignCenter = () => execCommand('justifyCenter')
    const formatAlignRight = () => execCommand('justifyRight')
    const formatH1 = () => execCommand('formatBlock', '<h1>')
    const formatH2 = () => execCommand('formatBlock', '<h2>')
    const formatH3 = () => execCommand('formatBlock', '<h3>')
    const formatQuote = () => execCommand('formatBlock', '<blockquote>')
    const formatParagraph = () => execCommand('formatBlock', '<p>')
    const formatUndo = () => execCommand('undo')
    const formatRedo = () => execCommand('redo')
    const formatCode = () => execCommand('formatBlock', '<pre>')
    const formatHorizontalRule = () => execCommand('insertHorizontalRule')

    // Link ekleme
    const handleInsertLink = () => {
      if (linkUrl && linkText) {
        execCommand('insertHTML', `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`)
        setLinkUrl('')
        setLinkText('')
        setShowLinkPopover(false)
      }
    }

    // Görsel ekleme
    const handleInsertImage = () => {
      if (imageUrl) {
        const alt = imageAlt || 'image'
        execCommand('insertHTML', `<img src="${imageUrl}" alt="${alt}" style="max-width: 100%; height: auto;" />`)
        setImageUrl('')
        setImageAlt('')
        setShowImagePopover(false)
      }
    }

    return (
      <div className={cn('border rounded-md flex flex-col', className)}>
        {/* Araç Çubuğu */}
        <div className="border-b bg-muted/50 p-1 flex flex-wrap gap-1">
          <TooltipProvider delayDuration={300}>
            {/* Biçim Çubuğu */}
            <div className="flex items-center space-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={formatBold}
                    disabled={disabled}
                  >
                    <Bold className="h-4 w-4" />
                    <span className="sr-only">Kalın</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Kalın</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={formatItalic}
                    disabled={disabled}
                  >
                    <Italic className="h-4 w-4" />
                    <span className="sr-only">İtalik</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>İtalik</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="mx-1 h-6" />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={formatUnorderedList}
                    disabled={disabled}
                  >
                    <List className="h-4 w-4" />
                    <span className="sr-only">Sırasız Liste</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sırasız Liste</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={formatOrderedList}
                    disabled={disabled}
                  >
                    <ListOrdered className="h-4 w-4" />
                    <span className="sr-only">Sıralı Liste</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sıralı Liste</TooltipContent>
              </Tooltip>
              
              <Separator orientation="vertical" className="mx-1 h-6" />
              
              <ToggleGroup type="single" className="flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="left" onClick={formatAlignLeft} disabled={disabled} className="h-8 w-8">
                      <AlignLeft className="h-4 w-4" />
                      <span className="sr-only">Sola Hizala</span>
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Sola Hizala</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="center" onClick={formatAlignCenter} disabled={disabled} className="h-8 w-8">
                      <AlignCenter className="h-4 w-4" />
                      <span className="sr-only">Ortala</span>
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Ortala</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="right" onClick={formatAlignRight} disabled={disabled} className="h-8 w-8">
                      <AlignRight className="h-4 w-4" />
                      <span className="sr-only">Sağa Hizala</span>
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Sağa Hizala</TooltipContent>
                </Tooltip>
              </ToggleGroup>
              
              <Separator orientation="vertical" className="mx-1 h-6" />
              
              <ToggleGroup type="single" className="flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="h1" onClick={formatH1} disabled={disabled} className="h-8 w-8">
                      <Heading1 className="h-4 w-4" />
                      <span className="sr-only">Başlık 1</span>
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Başlık 1</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="h2" onClick={formatH2} disabled={disabled} className="h-8 w-8">
                      <Heading2 className="h-4 w-4" />
                      <span className="sr-only">Başlık 2</span>
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Başlık 2</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="h3" onClick={formatH3} disabled={disabled} className="h-8 w-8">
                      <Heading3 className="h-4 w-4" />
                      <span className="sr-only">Başlık 3</span>
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Başlık 3</TooltipContent>
                </Tooltip>
              </ToggleGroup>
              
              <Separator orientation="vertical" className="mx-1 h-6" />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={formatQuote}
                    disabled={disabled}
                  >
                    <Quote className="h-4 w-4" />
                    <span className="sr-only">Alıntı</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Alıntı</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={formatCode}
                    disabled={disabled}
                  >
                    <Code className="h-4 w-4" />
                    <span className="sr-only">Kod</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Kod Bloğu</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={formatHorizontalRule}
                    disabled={disabled}
                  >
                    <Divide className="h-4 w-4" />
                    <span className="sr-only">Ayırıcı Çizgi</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ayırıcı Çizgi</TooltipContent>
              </Tooltip>
              
              <Separator orientation="vertical" className="mx-1 h-6" />
              
              {/* Link Ekleme */}
              <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        disabled={disabled}
                      >
                        <Link className="h-4 w-4" />
                        <span className="sr-only">Link Ekle</span>
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Link Ekle</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Link Ekle</h4>
                      <p className="text-sm text-muted-foreground">
                        Link URL'si ve görüntülenecek metin girin.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="link-url">URL</Label>
                      <Input
                        id="link-url"
                        placeholder="https://example.com"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="link-text">Metin</Label>
                      <Input
                        id="link-text"
                        placeholder="Link metni"
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleInsertLink} disabled={!linkUrl || !linkText}>Ekle</Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Görsel Ekleme */}
              <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        disabled={disabled}
                      >
                        <Image className="h-4 w-4" />
                        <span className="sr-only">Görsel Ekle</span>
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Görsel Ekle</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Görsel Ekle</h4>
                      <p className="text-sm text-muted-foreground">
                        Görsel URL'si ve alternatif metin girin.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="image-url">Görsel URL'si</Label>
                      <Input
                        id="image-url"
                        placeholder="https://example.com/image.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="image-alt">Alternatif Metin</Label>
                      <Input
                        id="image-alt"
                        placeholder="Görsel açıklaması"
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleInsertImage} disabled={!imageUrl}>Ekle</Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Separator orientation="vertical" className="mx-1 h-6" />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={formatUndo}
                    disabled={disabled}
                  >
                    <Undo className="h-4 w-4" />
                    <span className="sr-only">Geri Al</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Geri Al</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={formatRedo}
                    disabled={disabled}
                  >
                    <Redo className="h-4 w-4" />
                    <span className="sr-only">Yeniden Yap</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Yeniden Yap</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
        
        {/* Düzenleyici İçeriği */}
        <div
          ref={editorRef}
          className={cn(
            'flex-1 p-4 outline-none overflow-y-auto',
            disabled ? 'bg-muted cursor-not-allowed' : '',
          )}
          contentEditable={!disabled}
          onInput={updateContent}
          onBlur={updateContent}
          style={{ minHeight, maxHeight }}
          data-placeholder={placeholder}
          dir="auto"
        />
      </div>
    )
  }
)

Editor.displayName = 'Editor'

export default Editor 