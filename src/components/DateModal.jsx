import React, { useState, useEffect, useRef } from 'react';
import { compressImage, isValidImage } from '../utils/imageUtils';
import { savePhoto, getPhotos, getCoverPhoto } from '../utils/photoDb';
import { saveGroupPhoto, getGroupPhotos } from '../utils/groupService';
import { useAuth } from '../contexts/AuthContext';

/**
 * DateModal — Modal para criar/editar compromissos (dates)
 * Inclui: checkbox de conclusão, upload de fotos, Google Maps
 */
export default function DateModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onToggleCompleted,
  onOpenGallery,
  onCoverChange,
  editingDate,
  selectedDate,
  groupId = null, // Novo prop para identificar se é um date de grupo
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    cost: '',
    location: '',
    imageUrl: '',
    completed: false,
  });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const titleRef = useRef(null);
  const fileInputRef = useRef(null);

  // Preencher formulário ao abrir
  useEffect(() => {
    if (isOpen) {
      if (editingDate) {
        setFormData({
          title: editingDate.title || '',
          description: editingDate.description || '',
          date: editingDate.date || '',
          cost: editingDate.cost || '',
          location: editingDate.location || '',
          imageUrl: editingDate.imageUrl || '',
          completed: editingDate.completed || false,
        });
        // Carregar fotos existentes
        loadPhotos(editingDate.id);
      } else {
        setFormData({
          title: '',
          description: '',
          date: selectedDate || '',
          cost: '',
          location: '',
          imageUrl: '',
          completed: false,
        });
        setPhotos([]);
      }
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen, editingDate, selectedDate]);

  const loadPhotos = async (dateId) => {
    try {
      const p = groupId 
        ? await getGroupPhotos(groupId, dateId)
        : await getPhotos(dateId);
      setPhotos(p);
    } catch (e) {
      console.warn('Erro ao carregar fotos:', e);
    }
  };

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEditing = !!editingDate;
  const isCompleted = formData.completed;

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;

    const dateData = {
      ...formData,
      cost: parseFloat(formData.cost) || 0,
      id: editingDate?.id || Date.now().toString(),
    };

    onSave(dateData);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Checkbox de conclusão
  const handleCompletedToggle = () => {
    const newVal = !formData.completed;
    setFormData((prev) => ({ ...prev, completed: newVal }));
    if (isEditing && onToggleCompleted) {
      onToggleCompleted(editingDate.id);
    }
  };

  // Upload de fotos
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !editingDate?.id) return;

    setUploading(true);
    let count = 0;

    for (const file of files) {
      if (!isValidImage(file)) {
        console.warn('[DateModal] Arquivo inválido:', file.name);
        continue;
      }

      try {
        setUploadProgress(`Processando ${++count}/${files.length}...`);
        const compressed = await compressImage(file);
        const isFirst = photos.length === 0 && count === 1;
        
        console.log('[DateModal] Enviando foto...', { isGroup: !!groupId, size: compressed.length });

        if (groupId) {
          await saveGroupPhoto(groupId, editingDate.id, compressed, isFirst, user?.uid);
        } else {
          await savePhoto(editingDate.id, compressed, isFirst);
        }

        // Se primeira foto, definir como capa
        if (isFirst && onCoverChange) {
          onCoverChange(editingDate.id, compressed);
        }
      } catch (err) {
        console.error('[DateModal] Erro ao processar/enviar foto:', err);
        alert(`Erro ao adicionar foto "${file.name}": ${err.message || 'Erro desconhecido'}`);
      }
    }

    // Recarregar fotos
    console.log('[DateModal] Recarregando álbum...');
    await loadPhotos(editingDate.id);
    setUploading(false);
    setUploadProgress('');

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const mapsUrl = formData.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location)}`
    : null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">
            {isEditing ? '✏️ Editar Date' : '❤️ Novo Date'}
          </h2>
          <button className="modal__close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {/* Checkbox de conclusão (só para edição) */}
            {isEditing && (
              <div
                className={`completion-toggle ${isCompleted ? 'completion-toggle--done' : ''}`}
                onClick={handleCompletedToggle}
                role="button"
                tabIndex={0}
              >
                <div className={`completion-toggle__check ${isCompleted ? 'completion-toggle__check--active' : ''}`}>
                  {isCompleted ? '✅' : '⬜'}
                </div>
                <div className="completion-toggle__text">
                  <span className="completion-toggle__label">
                    {isCompleted ? 'Date Concluído!' : 'Marcar como concluído'}
                  </span>
                  {isCompleted && (
                    <span className="completion-toggle__msg">🎉 Muito bom, continue assim!</span>
                  )}
                </div>
              </div>
            )}

            {/* Título */}
            <div className="modal__field">
              <label className="modal__label">Título</label>
              <input
                ref={titleRef}
                className="modal__input"
                type="text"
                placeholder="Ex: Jantar romântico"
                value={formData.title}
                onChange={handleChange('title')}
                required
              />
            </div>

            {/* Descrição */}
            <div className="modal__field">
              <label className="modal__label">Descrição</label>
              <textarea
                className="modal__input"
                placeholder="Detalhes do encontro..."
                value={formData.description}
                onChange={handleChange('description')}
                rows={3}
              />
            </div>

            {/* Data e Custo */}
            <div className="modal__row">
              <div className="modal__field">
                <label className="modal__label">Data</label>
                <input
                  className="modal__input"
                  type="date"
                  value={formData.date}
                  onChange={handleChange('date')}
                  required
                />
              </div>
              <div className="modal__field">
                <label className="modal__label">Gasto Previsto (R$)</label>
                <input
                  className="modal__input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={handleChange('cost')}
                />
              </div>
            </div>

            {/* Local */}
            <div className="modal__field">
              <label className="modal__label">Local</label>
              <input
                className="modal__input"
                type="text"
                placeholder="Nome ou endereço do local"
                value={formData.location}
                onChange={handleChange('location')}
              />
            </div>

            {/* Link Google Maps */}
            {mapsUrl && (
              <a
                className="modal__maps-link"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                📍 Abrir no Google Maps
              </a>
            )}

            {/* URL da Imagem */}
            <div className="modal__field">
              <label className="modal__label">URL da Imagem (opcional)</label>
              <input
                className="modal__input"
                type="url"
                placeholder="https://exemplo.com/foto.jpg"
                value={formData.imageUrl}
                onChange={handleChange('imageUrl')}
              />
            </div>

            {/* Preview da imagem */}
            {formData.imageUrl && (
              <div style={{
                width: '100%',
                height: '120px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
              }}>
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}

            {/* ========================================
                Seção de Álbum de Fotos (só para dates concluídos)
                ======================================== */}
            {isEditing && isCompleted && (
              <div className="photo-section">
                <div className="photo-section__header">
                  <span className="photo-section__title">📸 Álbum de Fotos</span>
                  <span className="photo-section__count">{photos.length} foto{photos.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Upload */}
                <div className="photo-upload">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handlePhotoUpload}
                    className="photo-upload__input"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="photo-upload__label">
                    {uploading ? (
                      <span>{uploadProgress}</span>
                    ) : (
                      <>
                        <span className="photo-upload__icon">📷</span>
                        <span>Toque para adicionar fotos</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Thumbnails das fotos */}
                {photos.length > 0 && (
                  <div className="photo-thumbnails">
                    {photos.slice(0, 6).map((photo) => (
                      <div
                        key={photo.id}
                        className={`photo-thumb ${photo.isCover ? 'photo-thumb--cover' : ''}`}
                      >
                        <img src={photo.dataUrl} alt="Foto" className="photo-thumb__img" />
                        {photo.isCover && <span className="photo-thumb__badge">⭐</span>}
                      </div>
                    ))}
                    {photos.length > 6 && (
                      <div className="photo-thumb photo-thumb--more">
                        +{photos.length - 6}
                      </div>
                    )}
                  </div>
                )}

                {/* Botão ver álbum completo */}
                {photos.length > 0 && (
                  <button
                    type="button"
                    className="photo-section__gallery-btn"
                    onClick={() => {
                      onClose();
                      setTimeout(() => onOpenGallery(editingDate), 200);
                    }}
                  >
                    🖼️ Ver Álbum Completo ({photos.length} fotos)
                  </button>
                )}
              </div>
            )}

            {/* Hint para dates não concluídos */}
            {isEditing && !isCompleted && (
              <div className="photo-section__hint">
                📸 Conclua o date para desbloquear o álbum de fotos!
              </div>
            )}
          </div>

          <div className="modal__footer">
            {isEditing && (
              <button
                type="button"
                className="modal__btn modal__btn--danger"
                onClick={() => {
                  onDelete(editingDate.id);
                  onClose();
                }}
              >
                🗑️
              </button>
            )}
            <button type="button" className="modal__btn modal__btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="modal__btn modal__btn--primary">
              {isEditing ? 'Salvar' : '❤️ Criar Date'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
