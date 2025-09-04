import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Calendar, MessageCircle, ThumbsUp, ThumbsDown, User, LogIn, LogOut, FileText, Users, Activity, AlertCircle, CheckCircle, XCircle, Send, ChevronRight, Clock, Building, Gavel, ExternalLink, BookOpen, Loader } from 'lucide-react';

// Supabase Client Setup
const supabaseUrl = 'https://oqqmfkqlcdynxgdefzfw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xcW1ma3FsY2R5bnhnZGVmemZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NTYsImV4cCI6MjA2ODQyMDc1Nn0.x_WQb3NjDWl120ZogADav3JfdHORzUWUAxZ1jEkooQk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hauptkomponente
export default function Politrendo() {
  const [user, setUser] = useState(null);
  const [vorgaenge, setVorgaenge] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeView, setActiveView] = useState('timeline');
  const [selectedVorgang, setSelectedVorgang] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef();
  const lastVorgangElementRef = useRef();
  
  const PAGE_SIZE = 5;
  
  // Auth State
  useEffect(() => {
    checkUser();
    loadVorgaenge();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadOrCreateProfile(session.user);
      }
    });
    
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [filter]);
  
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      await loadOrCreateProfile(user);
    }
  };
  
  const loadOrCreateProfile = async (user) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!profile) {
      await supabase.from('profiles').insert({
        id: user.id,
        username: user.email.split('@')[0],
        full_name: user.user_metadata?.full_name || '',
      });
    }
  };
  
  // Lade echte Bundestags-Daten
  const loadVorgaenge = async (loadMore = false) => {
    if (!loadMore) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const currentPage = loadMore ? page : 0;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      // Basis-Query für Vorgänge mit ihren aktuellen Positionen
      let query = supabase
        .from('vorgang')
        .select(`
          *,
          vorgangsposition!inner (
            id,
            titel,
            datum,
            dokumentart,
            aktivitaet_anzahl,
            vorgangsposition,
            zuordnung,
            gang,
            aktualisiert,
            vorgangsposition_fundstelle (
              pdf_url,
              dokumentnummer,
              datum,
              dokumentart,
              herausgeber
            ),
            vorgangsposition_ueberweisung (
              ausschuss,
              ausschuss_kuerzel,
              federfuehrung
            ),
            vorgangsposition_urheber (
              bezeichnung,
              titel,
              einbringer
            )
          ),
          vorgang_deskriptor (
            name,
            typ
          ),
          vorgang_sachgebiet (
            sachgebiet
          ),
          vorgang_initiative (
            initiative
          )
        `)
        .order('aktualisiert', { ascending: false })
        .range(from, to);
      
      // Filter anwenden
      if (filter !== 'all') {
        if (filter === 'gesetzgebung') {
          query = query.eq('vorgangstyp', 'Gesetzgebung');
        } else if (filter === 'antrag') {
          query = query.ilike('vorgangstyp', '%Antrag%');
        } else if (filter === 'anfrage') {
          query = query.or('vorgangstyp.ilike.%Anfrage%,vorgangstyp.ilike.%Interpellation%');
        } else if (filter === 'eu') {
          query = query.or('vorgangstyp.ilike.%EU%,vorgangstyp.ilike.%Europa%');
        }
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Verarbeite die Daten und finde die neueste Vorgangsposition für jeden Vorgang
      const processedData = data?.map(vorgang => {
        // Sortiere Vorgangspositionen nach Datum und nimm die neueste
        const sortedPositions = vorgang.vorgangsposition?.sort((a, b) => 
          new Date(b.datum || b.aktualisiert) - new Date(a.datum || a.aktualisiert)
        ) || [];
        
        return {
          ...vorgang,
          aktuellePosition: sortedPositions[0] || null,
          allePositionen: sortedPositions
        };
      }) || [];
      
      if (loadMore) {
        setVorgaenge(prev => [...prev, ...processedData]);
      } else {
        setVorgaenge(processedData);
      }
      
      // Prüfe ob es mehr Daten gibt
      if (processedData.length < PAGE_SIZE) {
        setHasMore(false);
      }
      
      setPage(currentPage + 1);
      
    } catch (error) {
      console.error('Error loading Vorgänge:', error);
      setVorgaenge([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  // Intersection Observer für Infinite Scroll
  useEffect(() => {
    if (loading || loadingMore) return;
    
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadVorgaenge(true);
      }
    });
    
    if (lastVorgangElementRef.current) {
      observerRef.current.observe(lastVorgangElementRef.current);
    }
    
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, loadingMore, hasMore]);
  
  const handleVote = async (vorgangId, voteType) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    // Hier könntest du eine eigene Voting-Tabelle für Vorgänge implementieren
    console.log('Vote for Vorgang:', vorgangId, voteType);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Politrendo
              </h1>
              <nav className="hidden md:flex space-x-6">
                <button
                  onClick={() => setActiveView('timeline')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeView === 'timeline' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setActiveView('stats')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeView === 'stats' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Statistiken
                </button>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">
                    {user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Abmelden</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Anmelden</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Hauptinhalt */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Banner */}
        {activeView === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aktive Vorgänge</p>
                  <p className="text-2xl font-bold">{vorgaenge.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gesetzgebung</p>
                  <p className="text-2xl font-bold">
                    {vorgaenge.filter(v => v.vorgangstyp === 'Gesetzgebung').length}
                  </p>
                </div>
                <Gavel className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Anträge</p>
                  <p className="text-2xl font-bold">
                    {vorgaenge.filter(v => v.vorgangstyp?.includes('Antrag')).length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Wahlperiode</p>
                  <p className="text-2xl font-bold">20</p>
                </div>
                <Building className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}
        
        {/* Filter Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 mr-2">Filter:</span>
          {['all', 'gesetzgebung', 'antrag', 'anfrage', 'eu'].map(filterType => (
            <button
              key={filterType}
              onClick={() => {
                setFilter(filterType);
                setVorgaenge([]);
                setPage(0);
                setHasMore(true);
              }}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {filterType === 'all' ? 'Alle' : 
               filterType === 'gesetzgebung' ? 'Gesetzgebung' :
               filterType === 'antrag' ? 'Anträge' :
               filterType === 'anfrage' ? 'Anfragen' : 'EU-Vorlagen'}
            </button>
          ))}
        </div>
        
        {/* Timeline/Content */}
        {loading && vorgaenge.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {vorgaenge.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Keine Vorgänge gefunden.</p>
              </div>
            ) : (
              <>
                {vorgaenge.map((vorgang, index) => {
                  const isLast = index === vorgaenge.length - 1;
                  return (
                    <div
                      key={vorgang.id}
                      ref={isLast ? lastVorgangElementRef : null}
                    >
                      <VorgangCard
                        vorgang={vorgang}
                        onVote={handleVote}
                        onSelect={() => setSelectedVorgang(vorgang)}
                        user={user}
                      />
                    </div>
                  );
                })}
                
                {loadingMore && (
                  <div className="flex justify-center py-8">
                    <Loader className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                )}
                
                {!hasMore && vorgaenge.length > 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Keine weiteren Vorgänge
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
      
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      
      {/* Detail Modal */}
      {selectedVorgang && (
        <VorgangDetailModal
          vorgang={selectedVorgang}
          onClose={() => setSelectedVorgang(null)}
          user={user}
          onVote={handleVote}
        />
      )}
    </div>
  );
}

// Vorgang Card Component (für echte Bundestags-Daten)
function VorgangCard({ vorgang, onVote, onSelect, user }) {
  const getVorgangsTypIcon = (typ) => {
    if (typ?.includes('Gesetz')) return '⚖️';
    if (typ?.includes('Antrag')) return '📋';
    if (typ?.includes('Anfrage')) return '❓';
    if (typ?.includes('EU')) return '🇪🇺';
    if (typ?.includes('Unterrichtung')) return '📢';
    if (typ?.includes('Verordnung')) return '📜';
    return '📄';
  };
  
  const getBeratungsstandColor = (stand) => {
    if (stand?.includes('Beschlossen')) return 'bg-green-100 text-green-700';
    if (stand?.includes('Beratung')) return 'bg-blue-100 text-blue-700';
    if (stand?.includes('Überwiesen')) return 'bg-purple-100 text-purple-700';
    if (stand?.includes('Erledigt')) return 'bg-gray-100 text-gray-700';
    if (stand?.includes('Abgelehnt')) return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };
  
  const aktuellePosition = vorgang.aktuellePosition;
  const fundstelle = aktuellePosition?.vorgangsposition_fundstelle?.[0];
  const ueberweisung = aktuellePosition?.vorgangsposition_ueberweisung?.[0];
  const initiatoren = vorgang.vorgang_initiative?.map(i => i.initiative).join(', ');
  const sachgebiete = vorgang.vorgang_sachgebiet?.map(s => s.sachgebiet).slice(0, 3);
  
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {/* Header mit Typ und Status */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{getVorgangsTypIcon(vorgang.vorgangstyp)}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBeratungsstandColor(vorgang.beratungsstand)}`}>
              {vorgang.beratungsstand || 'In Bearbeitung'}
            </span>
            {vorgang.wahlperiode && (
              <span className="text-xs text-gray-500">WP {vorgang.wahlperiode}</span>
            )}
          </div>
          
          {/* Titel */}
          <h3 
            className="text-lg font-semibold mb-2 cursor-pointer hover:text-blue-600 transition-colors line-clamp-2"
            onClick={onSelect}
          >
            {vorgang.titel}
          </h3>
          
          {/* Abstract/Beschreibung */}
          {vorgang.abstract && (
            <p className="text-gray-600 mb-3 line-clamp-2">
              {vorgang.abstract}
            </p>
          )}
          
          {/* Metadaten */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {initiatoren && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="line-clamp-1">{initiatoren}</span>
              </div>
            )}
            
            {aktuellePosition?.datum && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(aktuellePosition.datum).toLocaleDateString('de-DE')}</span>
              </div>
            )}
            
            {ueberweisung && (
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                <span>{ueberweisung.ausschuss_kuerzel || ueberweisung.ausschuss}</span>
              </div>
            )}
            
            {aktuellePosition?.aktivitaet_anzahl > 0 && (
              <div className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                <span>{aktuellePosition.aktivitaet_anzahl} Aktivitäten</span>
              </div>
            )}
          </div>
          
          {/* Sachgebiete Tags */}
          {sachgebiete && sachgebiete.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {sachgebiete.map((gebiet, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  {gebiet}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Action Section */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Aktuelle Vorgangsposition */}
            {aktuellePosition && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Aktueller Stand:</span>{' '}
                {aktuellePosition.titel || aktuellePosition.vorgangsposition}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {fundstelle?.pdf_url && (
              <a
                href={fundstelle.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm">PDF</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            
            <button
              onClick={onSelect}
              className="flex items-center gap-1 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <span>Details</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Auth Modal Component
function AuthModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Bitte füllen Sie alle Felder aus');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Bitte überprüfen Sie Ihre E-Mails zur Bestätigung!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">
          {isSignUp ? 'Konto erstellen' : 'Anmelden'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ihre@email.de"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Bitte warten...' : (isSignUp ? 'Registrieren' : 'Anmelden')}
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:underline text-sm"
          >
            {isSignUp ? 'Bereits registriert? Anmelden' : 'Neu hier? Konto erstellen'}
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// Vorgang Detail Modal
function VorgangDetailModal({ vorgang, onClose, user, onVote }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const initiatoren = vorgang.vorgang_initiative?.map(i => i.initiative).join(', ');
  const sachgebiete = vorgang.vorgang_sachgebiet?.map(s => s.sachgebiet);
  const deskriptoren = vorgang.vorgang_deskriptor?.map(d => d.name);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {vorgang.vorgangstyp}
                </span>
                <span className="text-sm text-gray-500">
                  ID: {vorgang.id} | WP: {vorgang.wahlperiode}
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{vorgang.titel}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {initiatoren && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {initiatoren}
                  </span>
                )}
                {vorgang.datum && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(vorgang.datum).toLocaleDateString('de-DE')}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Content with scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b">
            {['overview', 'positions', 'documents'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'overview' ? 'Übersicht' :
                 tab === 'positions' ? 'Verlauf' : 'Dokumente'}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Beratungsstand */}
              <div>
                <h3 className="font-semibold mb-2">Beratungsstand</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{vorgang.beratungsstand || 'Nicht angegeben'}</p>
                </div>
              </div>
              
              {/* Abstract */}
              {vorgang.abstract && (
                <div>
                  <h3 className="font-semibold mb-2">Zusammenfassung</h3>
                  <p className="text-gray-700 leading-relaxed">{vorgang.abstract}</p>
                </div>
              )}
              
              {/* Sachgebiete */}
              {sachgebiete && sachgebiete.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Sachgebiete</h3>
                  <div className="flex flex-wrap gap-2">
                    {sachgebiete.map((gebiet, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {gebiet}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Deskriptoren */}
              {deskriptoren && deskriptoren.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Schlagwörter</h3>
                  <div className="flex flex-wrap gap-2">
                    {deskriptoren.map((desk, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                        {desk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* GESTA & weitere IDs */}
              {(vorgang.gesta || vorgang.kom || vorgang.ratsdok) && (
                <div>
                  <h3 className="font-semibold mb-2">Referenzen</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    {vorgang.gesta && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">GESTA:</span>
                        <span className="font-mono">{vorgang.gesta}</span>
                      </div>
                    )}
                    {vorgang.kom && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">KOM:</span>
                        <span className="font-mono">{vorgang.kom}</span>
                      </div>
                    )}
                    {vorgang.ratsdok && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ratsdok:</span>
                        <span className="font-mono">{vorgang.ratsdok}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'positions' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">Bearbeitungsverlauf</h3>
              {vorgang.allePositionen && vorgang.allePositionen.length > 0 ? (
                <div className="space-y-3">
                  {vorgang.allePositionen.map((position, idx) => (
                    <div key={position.id} className="border-l-4 border-blue-200 pl-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-medium text-gray-500">
                              {position.datum ? new Date(position.datum).toLocaleDateString('de-DE') : 'Kein Datum'}
                            </span>
                            {position.gang && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                Wichtiger Schritt
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium mb-1">
                            {position.vorgangsposition || position.titel || 'Unbenannt'}
                          </h4>
                          {position.zuordnung && (
                            <span className="text-sm text-gray-600">
                              Zuordnung: {position.zuordnung}
                            </span>
                          )}
                        </div>
                        
                        {position.vorgangsposition_fundstelle?.[0]?.pdf_url && (
                          <a
                            href={position.vorgangsposition_fundstelle[0].pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">PDF</span>
                          </a>
                        )}
                      </div>
                      
                      {/* Überweisung Info */}
                      {position.vorgangsposition_ueberweisung?.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Ausschüsse:</span>{' '}
                          {position.vorgangsposition_ueberweisung.map((u, i) => (
                            <span key={i}>
                              {u.ausschuss}
                              {u.federfuehrung && ' (federführend)'}
                              {i < position.vorgangsposition_ueberweisung.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Keine Vorgangspositionen verfügbar</p>
              )}
            </div>
          )}
          
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">Verknüpfte Dokumente</h3>
              {vorgang.allePositionen?.some(p => p.vorgangsposition_fundstelle?.length > 0) ? (
                <div className="space-y-3">
                  {vorgang.allePositionen.map(position => 
                    position.vorgangsposition_fundstelle?.map((doc, idx) => (
                      <div key={`${position.id}-${idx}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-gray-400" />
                          <div>
                            <p className="font-medium">
                              {doc.dokumentnummer || 'Dokument'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {doc.dokumentart || 'Unbekannter Typ'} • {doc.herausgeber || 'Unbekannt'}
                            </p>
                            {doc.datum && (
                              <p className="text-xs text-gray-500">
                                {new Date(doc.datum).toLocaleDateString('de-DE')}
                              </p>
                            )}
                          </div>
                        </div>
                        {doc.pdf_url && (
                          <a
                            href={doc.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <BookOpen className="h-4 w-4" />
                            <span>Öffnen</span>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Keine Dokumente verfügbar</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
