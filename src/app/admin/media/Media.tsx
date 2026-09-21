'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { gate, supabase, publicUrl, esc, fmtDate, getAllInUseImagesMap, showEmpty, confirmDialog, toast, publishSite, configured } from '@/scripts/admin/core';

interface FileItem {
  name: string;
  id: string;
  created_at: string;
  size?: number;
  inUse?: string[];
}

export default function Media() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const formatSize = (size?: number): string => {
    if (!size) return '—';
    if (size / 1024 < 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const loadFiles = useCallback(async () => {
    if (!authorized) return;
    
    setLoading(true);
    try {
      const [rawFiles, inUseMap] = await Promise.all([
        (async () => {
          const { data, error } = await supabase.storage.from('product-images').list('', { 
            limit: 1000, 
            sortBy: { column: 'created_at', order: 'desc' } 
          });
          if (error) throw error;
          return (data || []).map((f: any) => ({ 
            name: f.name, 
            id: f.id, 
            created_at: f.created_at || '', 
            size: f.metadata?.size 
          })) as FileItem[];
        })(),
        getAllInUseImagesMap()
      ]);

      const filesWithUsage = rawFiles.map(file => {
        const usages = inUseMap.get(file.name) || inUseMap.get(`media/${file.name}`);
        if (usages && usages.length) return { ...file, inUse: usages };
        return file;
      });

      setFiles(filesWithUsage);
      setFilteredFiles(filesWithUsage);
    } catch (error) {
      console.error('[Media] Failed to load files:', error);
      toast('Failed to load images', 'error');
    } finally {
      setLoading(false);
    }
  }, [authorized]);

  useEffect(() => {
    let mounted = true;
    
    (async () => {
      const isAdmin = await gate();
      if (!mounted) return;
      
      if (isAdmin) {
        setAuthorized(true);
        await loadFiles();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [loadFiles]);

  useEffect(() => {
    if (!authorized) return;
    const filtered = search.trim().toLowerCase()
      ? files.filter(f => f.name.toLowerCase().includes(search.trim().toLowerCase()))
      : files;
    setFilteredFiles(filtered);
  }, [search, files, authorized]);

  const handleUpload = async () => {
    if (!authorized) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async () => {
      const filesToUpload = Array.from(input.files || []);
      if (!filesToUpload.length) return;
      
      const errors: string[] = [];
      
      for (const file of filesToUpload) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const storagePath = `media/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('product-images').upload(storagePath, file, { 
          cacheControl: '3600', 
          upsert: false 
        });
        if (error) errors.push(`${file.name}: ${error.message}`);
      }
      
      if (errors.length) {
        toast(errors[0], 'error');
      } else {
        toast(`Uploaded ${filesToUpload.length} image${filesToUpload.length > 1 ? 's' : ''}.`, 'success');
        publishSite();
        await loadFiles();
      }
    };
    
    input.click();
  };

  const handleDelete = async (name: string) => {
    if (!authorized) return;
    
    const file = files.find(f => f.name === name);
    if (file?.inUse && file.inUse.length) {
      toast(`Cannot delete "${name}": it is currently ${file.inUse.join(' and ')}.`, 'error');
      return;
    }
    
    const ok = await confirmDialog('Delete image?', `Permanently delete "${name}" from storage? This cannot be undone.`, 'Delete');
    if (!ok) return;
    
    const { error } = await supabase.storage.from('product-images').remove([name]);
    if (error) { 
      toast(error.message, 'error'); 
      return; 
    }
    
    toast('Image deleted.', 'success');
    publishSite();
    await loadFiles();
  };

  if (!configured() || !authorized) {
    return (
      <AdminShell title="Media Library" current="media">
        <div className="a-card">
          <div className="a-card-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h3 style={{ color: 'var(--a-navy)', marginBottom: '8px' }}>Supabase Not Configured</h3>
            <p style={{ color: 'var(--a-muted)', marginBottom: '16px' }}>
              The media library requires Supabase credentials. Please configure <code>.env.local</code> with your Supabase URL and anon key.
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Media Library" current="media">
      <div className="a-page-head">
        <h2>Media Library</h2>
        <button type="button" className="a-btn a-btn-primary" onClick={handleUpload}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Upload image
        </button>
      </div>

      <div className="a-card">
        <div className="a-toolbar" style={{ flexWrap: 'wrap' }}>
          <input 
            type="search" 
            className="a-input" 
            placeholder="Search filename…" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '250px' }}
          />
          <span style={{ flex: 1 }}></span>
          <span style={{ fontSize: '0.84rem', color: 'var(--a-muted)' }}>
            {filteredFiles.length} image{filteredFiles.length !== 1 ? 's' : ''}{loading && ' (loading…)'}
          </span>
        </div>
        
        <div className="a-card-body">
          {loading ? (
            <div className="a-inline-loading">
              <div className="a-spinner"></div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="a-empty">
              <h3>{files.length === 0 ? 'No images uploaded' : 'No images found'}</h3>
              <p>
                {files.length === 0 
                  ? 'Upload product images to the media library.'
                  : 'Try a different search or upload new images.'
                }
              </p>
              {files.length === 0 && (
                <button type="button" className="a-btn a-btn-primary" onClick={handleUpload}>
                  Upload image
                </button>
              )}
            </div>
          ) : (
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Filename</th>
                    <th>Uploaded</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => {
                    const thumbUrl = publicUrl(file.name, 120);
                    const fullUrl = publicUrl(file.name, 1200);
                    const inUse = file.inUse && file.inUse.length > 0;
                    
                    return (
                      <tr key={file.id || file.name}>
                        <td>
                          <img 
                            src={esc(thumbUrl)} 
                            alt="" 
                            className="a-thumb" 
                            loading="lazy" 
                          />
                        </td>
                        <td style={{ wordBreak: 'break-all', fontSize: '0.82rem' }}>
                          {esc(file.name)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                          {fmtDate(file.created_at)}
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>
                          {formatSize(file.size)}
                        </td>
                        <td>
                          {inUse ? (
                            <span className="a-badge a-badge-active" style={{ background: 'var(--a-info-bg)', color: 'var(--a-info)' }}>
                              In use
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--a-faint)' }}>
                              Not in use
                            </span>
                          )}
                        </td>
                        <td className="a-actions">
                          <a href={esc(fullUrl)} target="_blank" rel="noopener" className="a-btn a-btn-sm">Open</a>
                          <button 
                            type="button" 
                            className="a-btn a-btn-sm a-btn-danger" 
                            onClick={() => handleDelete(file.name)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}