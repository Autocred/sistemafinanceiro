'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check, Users } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyLabel?: string;
  minWidth?: number | string;
  maxWidth?: number | string;
  height?: number | string;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Buscar...',
  emptyLabel = 'Todos',
  minWidth = 140,
  maxWidth = 180,
  height = 26,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputSearchRef = useRef<HTMLInputElement>(null);

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Foca o input de busca ao abrir o dropdown
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => {
        inputSearchRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(term));
  }, [options, search]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        minWidth: minWidth,
        maxWidth: maxWidth,
        flexShrink: 0,
      }}
    >
      {/* Botão Gatilho Compacto com Efeito 3D e Sombra de Contorno */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 5,
          padding: '2px 8px',
          fontSize: '10.5px',
          fontWeight: value ? 700 : 600,
          borderRadius: 8,
          border: `1px solid ${isOpen ? 'var(--primary)' : value ? 'var(--primary)' : 'var(--border)'}`,
          background: value
            ? 'linear-gradient(180deg, rgba(var(--primary-rgb, 59, 130, 246), 0.12) 0%, rgba(var(--primary-rgb, 59, 130, 246), 0.05) 100%)'
            : 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-body) 100%)',
          color: value ? 'var(--primary)' : 'var(--text-primary)',
          cursor: 'pointer',
          outline: 'none',
          height: `${height}px`,
          boxSizing: 'border-box',
          boxShadow: isOpen
            ? '0 0 0 2px rgba(var(--primary-rgb, 59, 130, 246), 0.3), 0 3px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)',
          transition: 'all 0.18s ease',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.25)';
            e.currentTarget.style.transform = 'translateY(-0.5px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
        title={value || emptyLabel}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Users size={11} style={{ flexShrink: 0, opacity: value ? 1 : 0.65 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value || emptyLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {value && (
            <span
              onClick={handleClear}
              title="Limpar filtro"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 13,
                height: 13,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.18)',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              <X size={9} />
            </span>
          )}
          <ChevronDown
            size={11}
            style={{
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              opacity: 0.7,
            }}
          />
        </div>
      </button>

      {/* Dropdown Flutuante Moderno 3D com Barra de Busca ao Digitar */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 100,
            width: '260px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 12px 28px rgba(0,0,0,0.22), 0 3px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Barra de Pesquisa ao Digitar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-body)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Search size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              ref={inputSearchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '11px',
                color: 'var(--text-primary)',
                fontWeight: 500,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 2,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Lista de Opções com Rolagem Suave */}
          <div
            style={{
              maxHeight: '210px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {/* Opção Todos / Limpar */}
            <div
              onClick={() => handleSelect('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderRadius: 6,
                fontSize: '10.5px',
                fontWeight: !value ? 700 : 500,
                color: !value ? 'var(--primary)' : 'var(--text-secondary)',
                background: !value ? 'rgba(var(--primary-rgb, 59, 130, 246), 0.12)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (value) e.currentTarget.style.background = 'var(--bg-body)';
              }}
              onMouseLeave={(e) => {
                if (value) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{emptyLabel}</span>
              {!value && <Check size={11} color="var(--primary)" />}
            </div>

            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '14px 8px',
                  textAlign: 'center',
                  fontSize: '10.5px',
                  color: 'var(--text-muted)',
                }}
              >
                Nenhum resultado para "{search}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt;
                return (
                  <div
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      padding: '5px 8px',
                      borderRadius: 6,
                      fontSize: '10.5px',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                      background: isSelected ? 'rgba(var(--primary-rgb, 59, 130, 246), 0.12)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-body)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={opt}
                    >
                      {opt}
                    </span>
                    {isSelected && <Check size={11} color="var(--primary)" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé com Total Encontrado */}
          <div
            style={{
              padding: '4px 8px',
              fontSize: '9px',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-body)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{filteredOptions.length} contato{filteredOptions.length === 1 ? '' : 's'}</span>
            {value && (
              <span
                onClick={handleClear}
                style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 700 }}
              >
                Limpar
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
