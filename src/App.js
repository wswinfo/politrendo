import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Calendar, MessageCircle, ThumbsUp, ThumbsDown, User, LogIn, LogOut, Plus, TrendingUp, Clock, Filter, Star, AlertCircle, CheckCircle, XCircle, Send, Hash, Users, Activity } from 'lucide-react';

// Supabase Client Setup
const supabaseUrl = 'https://oqqmfkqlcdynxgdefzfw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xcW1ma3FsY2R5bnhnZGVmemZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NTYsImV4cCI6MjA2ODQyMDc1Nn0.x_WQb3NjDWl120ZogADav3JfdHORzUWUAxZ1jEkooQk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hauptkomponente
export default function Politrendo() {
  const [user, setUser] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('timeline');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [filter, setFilter] = useState('all');
  
  // Auth State
  useEffect(() => {
    checkUser();
    loadProposals();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadOrCreateProfile(session.user);
      }
    });
    
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);
  
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
  
  const loadProposals = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('proposals')
        .select(`
          *,
          profiles:author_id (username, user_type, verified),
          votes (vote_type),
          comments (id)
        `)
        .order('created_at', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Demo-Daten, falls keine vorhanden
      if (!data || data.length === 0) {
        const demoProposals = [
          {
            id: '1',
            title: 'Gesetz zur Modernisierung des Gesundheitssystems',
            description: 'Reform der gesetzlichen Krankenversicherung mit Fokus auf digitale Gesundheitsanwendungen und Prävention. Einführung einer elektronischen Patientenakte für alle Versicherten.',
            category: 'Gesundheit',
            status: 'in_discussion',
            votes_pro: 1234,
            votes_contra: 567,
            comments_count: 89,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            profiles: { username: 'bundestag_admin', user_type: 'politician', verified: true }
          },
          {
            id: '2',
            title: 'Initiative für bezahlbaren Wohnraum',
            description: 'Maßnahmenpaket zur Schaffung von 400.000 neuen Wohnungen pro Jahr und Mietpreisbremse 2.0. Förderung des sozialen Wohnungsbaus.',
            category: 'Soziales',
            status: 'voting',
            votes_pro: 2456,
            votes_contra: 1123,
            comments_count: 234,
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            profiles: { username: 'maria_schmidt', user_type: 'citizen', verified: false }
          },
          {
            id: '3',
            title: 'Klimaschutz-Sofortprogramm 2025',
            description: 'Beschleunigte Energiewende mit Fokus auf erneuerbare Energien und CO2-Bepreisung. Ausbau der Windkraft und Solarenergie.',
            category: 'Umwelt',
            status: 'in_discussion',
            votes_pro: 3421,
            votes_contra: 892,
            comments_count: 412,
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            profiles: { username: 'umweltpartei', user_type: 'politician', verified: true }
          },
          {
            id: '4',
            title: 'Digitale Bildungsoffensive',
            description: 'Ausstattung aller Schulen mit digitaler Infrastruktur und Endgeräten. Fortbildungsprogramme für Lehrkräfte.',
            category: 'Bildung',
            status: 'accepted',
            votes_pro: 4521,
            votes_contra: 234,
            comments_count: 567,
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            profiles: { username: 'bildungsministerium', user_type: 'politician', verified: true }
          }
        ];
        setProposals(demoProposals);
      } else {
        setProposals(data);
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
      // Fallback auf Demo-Daten bei Fehler
      const demoProposals = [
        {
          id: '1',
          title: 'Gesetz zur Modernisierung des Gesundheitssystems',
          description: 'Reform der gesetzlichen Krankenversicherung mit Fokus auf digitale Gesundheitsanwendungen.',
          category: 'Gesundheit',
          status: 'in_discussion',
          votes_pro: 1234,
          votes_contra: 567,
          comments_count: 89,
          created_at: new Date().toISOString(),
          profiles: { username: 'demo_user', user_type: 'politician', verified: true }
        }
      ];
      setProposals(demoProposals);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVote = async (proposalId, voteType) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('votes')
        .upsert({
          proposal_id: proposalId,
          user_id: user.id,
          vote_type: voteType
        });
      
      if (!error) {
        loadProposals();
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
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
                  onClick={() => setActiveView('trending')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeView === 'trending' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Trending
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
        {/* Stats Banner - nur in Stats View */}
        {activeView === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aktive Vorschläge</p>
                  <p className="text-2xl font-bold">{proposals.filter(p => p.status === 'in_discussion').length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Abstimmungen</p>
                  <p className="text-2xl font-bold">{proposals.filter(p => p.status === 'voting').length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Angenommen</p>
                  <p className="text-2xl font-bold">{proposals.filter(p => p.status === 'accepted').length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gesamt Teilnahmen</p>
                  <p className="text-2xl font-bold">
                    {proposals.reduce((sum, p) => sum + (p.votes_pro || 0) + (p.votes_contra || 0), 0)}
                  </p>
                </div>
                <Hash className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}
        
        {/* Filter Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 mr-2">Filter:</span>
          {['all', 'in_discussion', 'voting', 'accepted', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => {
                setFilter(status);
                loadProposals();
              }}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'Alle' : 
               status === 'in_discussion' ? 'In Diskussion' :
               status === 'voting' ? 'Abstimmung' :
               status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}
            </button>
          ))}
        </div>
        
        {/* Timeline/Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {proposals.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Keine Gesetzesvorschläge vorhanden.</p>
                {user && (
                  <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="h-4 w-4 inline mr-2" />
                    Neuen Vorschlag erstellen
                  </button>
                )}
              </div>
            ) : (
              <>
                {activeView === 'timeline' && proposals.map(proposal => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onVote={handleVote}
                    onSelect={() => setSelectedProposal(proposal)}
                    user={user}
                  />
                ))}
                
                {activeView === 'trending' && proposals
                  .sort((a, b) => ((b.votes_pro || 0) + (b.votes_contra || 0)) - ((a.votes_pro || 0) + (a.votes_contra || 0)))
                  .slice(0, 5)
                  .map(proposal => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onVote={handleVote}
                      onSelect={() => setSelectedProposal(proposal)}
                      user={user}
                    />
                  ))}
                  
                {activeView === 'stats' && proposals.map(proposal => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onVote={handleVote}
                    onSelect={() => setSelectedProposal(proposal)}
                    user={user}
                  />
                ))}
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
      {selectedProposal && (
        <ProposalDetailModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          user={user}
          onVote={handleVote}
        />
      )}
    </div>
  );
}

// Proposal Card Component
function ProposalCard({ proposal, onVote, onSelect, user }) {
  const [userVote, setUserVote] = useState(null);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'in_discussion': return 'bg-blue-100 text-blue-700';
      case 'voting': return 'bg-purple-100 text-purple-700';
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Gesundheit': return '🏥';
      case 'Umwelt': return '🌍';
      case 'Soziales': return '🤝';
      case 'Wirtschaft': return '💼';
      case 'Bildung': return '🎓';
      case 'Verkehr': return '🚗';
      case 'Digitalisierung': return '💻';
      case 'Sicherheit': return '🛡️';
      default: return '📋';
    }
  };
  
  const handleVoteClick = (voteType) => {
    setUserVote(voteType);
    onVote(proposal.id, voteType);
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{getCategoryIcon(proposal.category)}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
              {proposal.status === 'in_discussion' ? 'In Diskussion' :
               proposal.status === 'voting' ? 'Abstimmung läuft' :
               proposal.status === 'accepted' ? 'Angenommen' : 
               proposal.status === 'rejected' ? 'Abgelehnt' :
               proposal.status}
            </span>
            {proposal.profiles?.verified && (
              <CheckCircle className="h-4 w-4 text-blue-500" />
            )}
          </div>
          
          <h3 
            className="text-lg font-semibold mb-2 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={onSelect}
          >
            {proposal.title}
          </h3>
          
          <p className="text-gray-600 mb-4 line-clamp-2">
            {proposal.description}
          </p>
          
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{proposal.profiles?.username || 'Anonym'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(proposal.created_at).toLocaleDateString('de-DE')}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>{proposal.comments_count || 0} Kommentare</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Voting Section */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleVoteClick('pro')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                userVote === 'pro' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-50 hover:bg-green-50 text-gray-700'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="font-medium">{proposal.votes_pro || 0}</span>
            </button>
            
            <button
              onClick={() => handleVoteClick('contra')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                userVote === 'contra'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-50 hover:bg-red-50 text-gray-700'
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              <span className="font-medium">{proposal.votes_contra || 0}</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onSelect}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Details ansehen →
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ 
                width: `${((proposal.votes_pro || 0) / ((proposal.votes_pro || 0) + (proposal.votes_contra || 0))) * 100 || 50}%` 
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Zustimmung: {Math.round(((proposal.votes_pro || 0) / ((proposal.votes_pro || 0) + (proposal.votes_contra || 0))) * 100) || 0}%</span>
            <span>Teilnehmer: {(proposal.votes_pro || 0) + (proposal.votes_contra || 0)}</span>
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

// Proposal Detail Modal Component
function ProposalDetailModal({ proposal, onClose, user, onVote }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  
  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    try {
      await supabase.from('comments').insert({
        proposal_id: proposal.id,
        user_id: user.id,
        content: comment
      });
      setComment('');
      alert('Kommentar hinzugefügt!');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };
  
  const handleDetailedVote = async (voteType) => {
    if (!user) {
      alert('Bitte melden Sie sich an');
      return;
    }
    
    try {
      await supabase.from('votes').upsert({
        proposal_id: proposal.id,
        user_id: user.id,
        vote_type: voteType,
        rating: rating,
        pros: pros.split('\n').filter(p => p.trim()),
        cons: cons.split('\n').filter(c => c.trim())
      });
      
      onVote(proposal.id, voteType);
      alert('Ihre Bewertung wurde gespeichert!');
    } catch (error) {
      console.error('Error submitting detailed vote:', error);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{proposal.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {proposal.profiles?.username || 'Anonym'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(proposal.created_at).toLocaleDateString('de-DE')}
                </span>
                <span>•</span>
                <span>{proposal.category}</span>
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
            {['overview', 'discussion', 'vote'].map(tab => (
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
                 tab === 'discussion' ? 'Diskussion' : 'Abstimmung'}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Beschreibung</h3>
                <p className="text-gray-700 leading-relaxed">{proposal.description}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Kernpunkte</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Digitale Transformation im öffentlichen Sektor</li>
                  <li>Nachhaltige Finanzierung</li>
                  <li>Bürgerbeteiligung stärken</li>
                  <li>Transparenz und Nachvollziehbarkeit</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Zeitplan</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Diskussionsphase:</span>
                      <span className="font-medium">14 Tage</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Abstimmung:</span>
                      <span className="font-medium">7 Tage</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Umsetzung:</span>
                      <span className="font-medium">Bei Annahme sofort</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'discussion' && (
            <div className="space-y-4">
              {user ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Teilen Sie Ihre Meinung..."
                    className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  <button 
                    onClick={handleAddComment}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Kommentar abgeben
                  </button>
                </div>
              ) : (
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-gray-700">Melden Sie sich an, um zu kommentieren.</p>
                </div>
              )}
              
              {/* Beispiel-Kommentare */}
              <div className="space-y-3">
                {[
                  { user: 'Max Mustermann', time: 'vor 2 Stunden', text: 'Sehr wichtiger Vorschlag! Die Digitalisierung muss endlich vorangetrieben werden.' },
                  { user: 'Anna Schmidt', time: 'vor 5 Stunden', text: 'Ich finde die Kostenschätzung fehlt noch. Wie soll das finanziert werden?' },
                  { user: 'Thomas Weber', time: 'vor 1 Tag', text: 'Endlich mal ein durchdachter Ansatz. Volle Unterstützung!' }
                ].map((comment, idx) => (
                  <div key={idx} className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">{comment.user}</span>
                        <span className="text-gray-500 text-sm ml-2">{comment.time}</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-gray-500 hover:text-green-600">
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button className="text-gray-500 hover:text-red-600">
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'vote' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-red-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-4">Ihre Bewertung</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Gesamtbewertung</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="text-2xl transition-transform hover:scale-110"
                        >
                          {star <= rating ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Pro-Argumente</label>
                      <textarea
                        value={pros}
                        onChange={(e) => setPros(e.target.value)}
                        placeholder="Was spricht dafür?"
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Contra-Argumente</label>
                      <textarea
                        value={cons}
                        onChange={(e) => setCons(e.target.value)}
                        placeholder="Was spricht dagegen?"
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleDetailedVote('pro')}
                      className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                    >
                      👍 Dafür stimmen
                    </button>
                    <button
                      onClick={() => handleDetailedVote('contra')}
                      className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                    >
                      👎 Dagegen stimmen
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Abstimmungsergebnis</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-8 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                      style={{ 
                        width: `${((proposal.votes_pro || 0) / ((proposal.votes_pro || 0) + (proposal.votes_contra || 0))) * 100 || 50}%` 
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{proposal.votes_pro || 0}</p>
                      <p className="text-sm text-gray-600">Dafür</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{proposal.votes_contra || 0}</p>
                      <p className="text-sm text-gray-600">Dagegen</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}