import React, { useState, useEffect, useRef } from 'react';
import { getPhotos, deletePhoto, setCoverPhoto } from '../utils/photoDb';
import { getGroupPhotos, deleteGroupPhoto, setGroupCoverPhoto } from '../utils/groupService';

/**
 * PhotoGallery — Modal galeria de fotos de um date
 * Grid responsivo, lightbox, definir capa, excluir fotos
 */
export default function PhotoGallery({ isOpen, onClose, dateEntry, onCoverChange, groupId = null }) {
  const [photos, setPhotos] = useState([]);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carregar fotos ao abrir
  useEffect(() => {
    if (isOpen && dateEntry?.id) {
      setLoading(true);
      const loadMethod = groupId 
        ? () => getGroupPhotos(groupId, dateEntry.id)
        : () => getPhotos(dateEntry.id);
      
      loadMethod()
        .then((p) => {
          setPhotos(p);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, dateEntry?.id]);

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (lightboxPhoto) {
          setLightboxPhoto(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, lightboxPhoto]);

  if (!isOpen || !dateEntry) return null;

  const handleSetCover = async (photoId) => {
    if (groupId) {
      await setGroupCoverPhoto(groupId, dateEntry.id, photoId);
    } else {
      await setCoverPhoto(dateEntry.id, photoId);
    }
    setPhotos((prev) =>
      prev.map((p) => ({ ...p, isCover: p.id === photoId }))
    );
    if (onCoverChange) {
      const photo = photos.find((p) => p.id === photoId);
      onCoverChange(dateEntry.id, photo?.dataUrl || null);
    }
  };

  const handleDelete = async (photoId) => {
    const photo = photos.find((p) => p.id === photoId);
    if (groupId) {
      await deleteGroupPhoto(photoId);
    } else {
      await deletePhoto(photoId);
    }
    const updatedPhotos = photos.filter((p) => p.id !== photoId);
    setPhotos(updatedPhotos);

    // Se a foto deletada era a capa, definir a próxima como capa
    if (photo?.isCover && updatedPhotos.length > 0) {
      if (groupId) {
        await setGroupCoverPhoto(groupId, dateEntry.id, updatedPhotos[0].id);
      } else {
        await setCoverPhoto(dateEntry.id, updatedPhotos[0].id);
      }
      setPhotos((prev) =>
        prev.map((p, i) => ({ ...p, isCover: i === 0 }))
      );
      if (onCoverChange) {
        onCoverChange(dateEntry.id, updatedPhotos[0]?.dataUrl || null);
      }
    } else if (updatedPhotos.length === 0 && onCoverChange) {
      onCoverChange(dateEntry.id, null);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const formattedDate = dateEntry.date
    ? dateEntry.date.split('-').reverse().join('/')
    : '';

  return (
    <>
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal gallery">
          <div className="modal__header">
            <div>
              <h2 className="modal__title">📸 {dateEntry.title}</h2>
              <div className="gallery__subtitle">
                {formattedDate}
                {dateEntry.location && ` • ${dateEntry.location}`}
              </div>
            </div>
            <button className="modal__close" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          </div>

          <div className="modal__body">
            {loading ? (
              <div className="gallery__loading">Carregando fotos...</div>
            ) : photos.length === 0 ? (
              <div className="gallery__empty">
                <span className="gallery__empty-icon">📷</span>
                <p>Nenhuma foto neste álbum ainda.</p>
                <p className="gallery__empty-hint">
                  Adicione fotos pelo editor do date!
                </p>
              </div>
            ) : (
              <div className="gallery__grid">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`gallery__item ${photo.isCover ? 'gallery__item--cover' : ''}`}
                    onClick={() => setLightboxPhoto(photo)}
                  >
                    <img
                      src={photo.dataUrl}
                      alt="Foto do date"
                      className="gallery__img"
                      loading="lazy"
                    />
                    <div className="gallery__item-actions">
                      <button
                        className={`gallery__action-btn ${photo.isCover ? 'gallery__action-btn--active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetCover(photo.id);
                        }}
                        title="Definir como capa"
                      >
                        ⭐
                      </button>
                      <button
                        className="gallery__action-btn gallery__action-btn--delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(photo.id);
                        }}
                        title="Excluir foto"
                      >
                        🗑️
                      </button>
                    </div>
                    {photo.isCover && (
                      <div className="gallery__cover-badge">CAPA</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal__footer">
            <span className="gallery__count">
              {photos.length} foto{photos.length !== 1 ? 's' : ''}
            </span>
            <button className="modal__btn modal__btn--secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="lightbox"
          onClick={() => setLightboxPhoto(null)}
        >
          <img
            src={lightboxPhoto.dataUrl}
            alt="Foto ampliada"
            className="lightbox__img"
          />
          <button
            className="lightbox__close"
            onClick={() => setLightboxPhoto(null)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
