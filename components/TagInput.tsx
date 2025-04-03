import { useState, KeyboardEvent, FC, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface TagInputProps {
  placeholder?: string
  tags: string[]
  setTags: (tags: string[]) => void
  maxTags?: number
  onBlur?: () => void
  disabled?: boolean
  className?: string
}

const TagInput: FC<TagInputProps> = ({
  placeholder = 'Etiket ekle...',
  tags,
  setTags,
  maxTags = 10,
  onBlur,
  disabled = false,
  className
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isTagOverflow, setIsTagOverflow] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Taşma durumunu kontrol et
  useEffect(() => {
    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [tags])

  // Taşma kontrolü
  const checkOverflow = () => {
    if (containerRef.current) {
      const { scrollWidth, clientWidth } = containerRef.current
      setIsTagOverflow(scrollWidth > clientWidth)
    }
  }

  // Yeni etiket ekle
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    
    // Boş etiketi engelle
    if (!trimmedTag) return
    
    // Maksimum etiket sınırını kontrol et
    if (tags.length >= maxTags) return
    
    // Aynı etiketi tekrar eklemeyi engelle (büyük-küçük harf duyarsız)
    if (tags.some(t => t.toLowerCase() === trimmedTag.toLowerCase())) return
    
    setTags([...tags, trimmedTag])
    setInputValue('')
  }

  // Etiketi kaldır
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  // Klavye olayları
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    
    // Enter veya virgül ile etiket ekle
    if ((e.key === 'Enter' || e.key === ',') && inputValue) {
      e.preventDefault()
      addTag(inputValue)
    }
    
    // Backspace ile son etiketi sil (input boşsa)
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  // Boşluk bırakıldığında etiket ekle
  const handleBlur = () => {
    if (inputValue) {
      addTag(inputValue)
    }
    onBlur?.()
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        className={cn(
          'flex flex-wrap gap-2 p-2 rounded-md border min-h-10 items-center overflow-hidden',
          {
            'bg-muted': disabled,
            'hover:border-input': !disabled,
            'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2': !disabled
          }
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <Badge 
            key={`${tag}-${index}`}
            variant="secondary"
            className={cn('flex items-center gap-1 px-3 py-1 text-xs', 
              disabled ? 'opacity-70 cursor-default' : '')
            }
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Etiketi kaldır</span>
              </button>
            )}
          </Badge>
        ))}
        
        {tags.length < maxTags && !disabled ? (
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 pl-1 min-w-[120px] h-7"
          />
        ) : (
          <span className="text-xs text-muted-foreground ml-1">
            {disabled ? '' : `Maksimum ${maxTags} etiket.`}
          </span>
        )}
      </div>

      {isTagOverflow && (
        <button
          type="button" 
          className="absolute bottom-1 right-2 bg-background/80 backdrop-blur-sm rounded text-muted-foreground text-xs px-1"
        >
          <span className="sr-only">Tüm etiketleri göster</span>
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export default TagInput 