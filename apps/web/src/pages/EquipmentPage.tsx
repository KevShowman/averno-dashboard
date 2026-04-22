import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentApi } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Shield, 
  Swords, 
  Target,
  Package,
  Plus, 
  User, 
  Calendar, 
  AlertTriangle, 
  Trash2,
  Edit,
  Clock,
  Users,
  Search,
  X,
  ChevronDown,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Zap,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/auth';
import { usersApi } from '../lib/api';

// Types
interface User {
  id: string;
  username: string;
  icFirstName?: string;
  icLastName?: string;
  avatarUrl?: string;
  role: string;
}

interface Weapon {
  id: string;
  userId: string;
  user: User;
  weaponType: string;
  receivedAt: string;
  lastLostAt?: string;
  hasTaschenlampe: boolean;
  hasTrommelmagazin: boolean;
  hasSchalldaempfer: boolean;
  hasGriff: boolean;
  hasErwMagazin: boolean;
  hasZielfernrohr: boolean;
  note?: string;
  createdBy: { id: string; username: string };
  createdAt: string;
}

interface Vest {
  id: string;
  userId: string;
  user: User;
  quantity: number;
  receivedAt: string;
  expectedEmptyAt: string;
  note?: string;
  createdBy: { id: string; username: string };
}

interface Ammo {
  id: string;
  userId: string;
  user: User;
  quantity: number;
  receivedAt: string;
  expectedEmptyAt: string;
  note?: string;
  createdBy: { id: string; username: string };
}

interface WeaponType {
  key: string;
  name: string;
  description: string;
}

interface Attachment {
  key: string;
  name: string;
}

interface Recommendation {
  bloodRecord: {
    id: string;
    vorname: string;
    nachname: string;
    telefon: number;
    bloodinTimestamp: string;
  };
  user: User | null;
  hasWeapon: boolean;
  isSicario: boolean;
  daysSinceBloodIn: number;
  status: 'green' | 'yellow' | 'red' | 'priority';
  statusText: string;
  priority: number;
}

interface RecommendationStats {
  total: number;
  withWeapon: number;
  withoutWeapon: number;
  priority: number;
  red: number;
  yellow: number;
  green: number;
}

type ViewMode = 'weapons' | 'vests' | 'ammo' | 'overview' | 'recommendations';

const WEAPON_TYPE_NAMES: Record<string, string> = {
  SMG: 'SMG',
  ADV: 'ADV',
  KARABINER: 'Karabiner',
  SPEZIALKARABINER: 'Spezialkarabiner',
  PDW: 'PDW',
  AK47: 'AK-47',
  TOMMY_GUN: 'Tommy Gun',
};

export default function EquipmentPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [showWeaponModal, setShowWeaponModal] = useState(false);
  const [showVestModal, setShowVestModal] = useState(false);
  const [showAmmoModal, setShowAmmoModal] = useState(false);
  const [editingWeapon, setEditingWeapon] = useState<Weapon | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [weaponData, setWeaponData] = useState({
    userId: '',
    weaponType: 'SMG',
    receivedAt: new Date().toISOString().split('T')[0],
    lastLostAt: '',
    hasTaschenlampe: false,
    hasTrommelmagazin: false,
    hasSchalldaempfer: false,
    hasGriff: false,
    hasErwMagazin: false,
    hasZielfernrohr: false,
    note: '',
  });

  const [vestData, setVestData] = useState({
    userId: '',
    quantity: 7,
    receivedAt: new Date().toISOString().split('T')[0],
    note: '',
  });

  const [ammoData, setAmmoData] = useState({
    userId: '',
    quantity: 14,
    receivedAt: new Date().toISOString().split('T')[0],
    note: '',
  });

  const isLeadership = user && ['PATRON', 'DON', 'CAPO'].includes(user.role);
  const canManage = user && (
    ['PATRON', 'DON', 'CAPO'].includes(user.role as string) ||
    (user.allRoles && (user.allRoles as string[]).includes('LOGISTICA'))
  );

  // Queries - Alle Mitglieder können sehen
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['equipment', 'stats'],
    queryFn: () => equipmentApi.getStats(),
  });

  const { data: weapons = [], isLoading: loadingWeapons } = useQuery({
    queryKey: ['equipment', 'weapons'],
    queryFn: () => equipmentApi.getAllWeapons(),
    enabled: viewMode === 'weapons' || viewMode === 'overview',
  });

  const { data: vests = [], isLoading: loadingVests } = useQuery({
    queryKey: ['equipment', 'vests'],
    queryFn: () => equipmentApi.getAllVests(),
    enabled: viewMode === 'vests' || viewMode === 'overview',
  });

  const { data: ammo = [], isLoading: loadingAmmo } = useQuery({
    queryKey: ['equipment', 'ammo'],
    queryFn: () => equipmentApi.getAllAmmo(),
    enabled: viewMode === 'ammo' || viewMode === 'overview',
  });

  const { data: weaponTypes = [] } = useQuery({
    queryKey: ['equipment', 'weapon-types'],
    queryFn: () => equipmentApi.getWeaponTypes(),
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['equipment', 'attachments'],
    queryFn: () => equipmentApi.getAttachments(),
  });

  const { data: recommendationsData, isLoading: loadingRecommendations } = useQuery({
    queryKey: ['equipment', 'recommendations'],
    queryFn: () => equipmentApi.getRecommendations(),
    enabled: viewMode === 'recommendations',
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAllUsers().then(res => res.data),
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['users', 'search', searchQuery],
    queryFn: () => usersApi.searchUsers(searchQuery).then(res => res.data),
    enabled: searchQuery.length >= 2,
  });

  // My Equipment (persönliche Ansicht)
  const { data: myEquipment } = useQuery({
    queryKey: ['equipment', 'my'],
    queryFn: () => equipmentApi.getMyEquipment(),
  });

  // Mutations
  const createWeaponMutation = useMutation({
    mutationFn: equipmentApi.createWeapon,
    onSuccess: () => {
      toast.success('Waffe erfolgreich eingetragen');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      resetWeaponForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Eintragen');
    },
  });

  const updateWeaponMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => equipmentApi.updateWeapon(id, data),
    onSuccess: () => {
      toast.success('Waffe erfolgreich aktualisiert');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      resetWeaponForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren');
    },
  });

  const deleteWeaponMutation = useMutation({
    mutationFn: equipmentApi.deleteWeapon,
    onSuccess: () => {
      toast.success('Waffe erfolgreich gelöscht');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen');
    },
  });

  const createVestMutation = useMutation({
    mutationFn: equipmentApi.createVest,
    onSuccess: () => {
      toast.success('Westen erfolgreich eingetragen');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      resetVestForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Eintragen');
    },
  });

  const deleteVestMutation = useMutation({
    mutationFn: equipmentApi.deleteVest,
    onSuccess: () => {
      toast.success('Westen-Eintrag gelöscht');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen');
    },
  });

  const createAmmoMutation = useMutation({
    mutationFn: equipmentApi.createAmmo,
    onSuccess: () => {
      toast.success('Munition erfolgreich eingetragen');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      resetAmmoForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Eintragen');
    },
  });

  const deleteAmmoMutation = useMutation({
    mutationFn: equipmentApi.deleteAmmo,
    onSuccess: () => {
      toast.success('Munitions-Eintrag gelöscht');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen');
    },
  });

  const resetWeaponForm = () => {
    setShowWeaponModal(false);
    setEditingWeapon(null);
    setWeaponData({
      userId: '',
      weaponType: 'SMG',
      receivedAt: new Date().toISOString().split('T')[0],
      lastLostAt: '',
      hasTaschenlampe: false,
      hasTrommelmagazin: false,
      hasSchalldaempfer: false,
      hasGriff: false,
      hasErwMagazin: false,
      hasZielfernrohr: false,
      note: '',
    });
    setSearchQuery('');
    setSelectedUserId('');
  };

  const resetVestForm = () => {
    setShowVestModal(false);
    setVestData({
      userId: '',
      quantity: 7,
      receivedAt: new Date().toISOString().split('T')[0],
      note: '',
    });
    setSearchQuery('');
    setSelectedUserId('');
  };

  const resetAmmoForm = () => {
    setShowAmmoModal(false);
    setAmmoData({
      userId: '',
      quantity: 14,
      receivedAt: new Date().toISOString().split('T')[0],
      note: '',
    });
    setSearchQuery('');
    setSelectedUserId('');
  };

  const handleEditWeapon = (weapon: Weapon) => {
    setEditingWeapon(weapon);
    setWeaponData({
      userId: weapon.userId,
      weaponType: weapon.weaponType,
      receivedAt: new Date(weapon.receivedAt).toISOString().split('T')[0],
      lastLostAt: weapon.lastLostAt ? new Date(weapon.lastLostAt).toISOString().split('T')[0] : '',
      hasTaschenlampe: weapon.hasTaschenlampe,
      hasTrommelmagazin: weapon.hasTrommelmagazin,
      hasSchalldaempfer: weapon.hasSchalldaempfer,
      hasGriff: weapon.hasGriff,
      hasErwMagazin: weapon.hasErwMagazin,
      hasZielfernrohr: weapon.hasZielfernrohr,
      note: weapon.note || '',
    });
    setSelectedUserId(weapon.userId);
    setShowWeaponModal(true);
  };

  const handleWeaponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...weaponData,
      userId: selectedUserId || weaponData.userId,
      lastLostAt: weaponData.lastLostAt || undefined,
      note: weaponData.note || undefined,
    };
    
    if (editingWeapon) {
      updateWeaponMutation.mutate({ id: editingWeapon.id, data });
    } else {
      createWeaponMutation.mutate(data);
    }
  };

  const handleVestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVestMutation.mutate({
      ...vestData,
      userId: selectedUserId || vestData.userId,
      note: vestData.note || undefined,
    });
  };

  const handleAmmoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAmmoMutation.mutate({
      ...ammoData,
      userId: selectedUserId || ammoData.userId,
      note: ammoData.note || undefined,
    });
  };

  const selectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSearchQuery('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (expectedEmptyAt: string) => {
    const now = new Date();
    const target = new Date(expectedEmptyAt);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getSelectedUserDisplay = () => {
    if (!selectedUserId) return null;
    const u = allUsers.find((u: User) => u.id === selectedUserId);
    if (!u) return null;
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/10 to-orange-500/10 border border-orange-500/30 rounded-xl shadow-lg shadow-orange-500/5">
        {u.avatarUrl ? (
          <img src={u.avatarUrl} alt={u.username} className="w-10 h-10 rounded-xl ring-2 ring-orange-500/50" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600/30 to-orange-600/30 flex items-center justify-center ring-2 ring-orange-500/50">
            <User className="h-5 w-5 text-orange-400" />
          </div>
        )}
        <div className="flex flex-col flex-1">
          <span className="text-orange-300 font-semibold">
            {u.icFirstName && u.icLastName ? `${u.icFirstName} ${u.icLastName}` : u.username}
          </span>
          <span className="text-xs text-orange-400/60">@{u.username}</span>
        </div>
        <button 
          onClick={() => setSelectedUserId('')} 
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const getAttachmentBadges = (weapon: Weapon): string[] => {
    const badges: string[] = [];
    if (weapon.hasTaschenlampe) badges.push('Lampe');
    if (weapon.hasTrommelmagazin) badges.push('Trommel');
    if (weapon.hasSchalldaempfer) badges.push('Schalld.');
    if (weapon.hasGriff) badges.push('Griff');
    if (weapon.hasErwMagazin) badges.push('Erw. Mag.');
    if (weapon.hasZielfernrohr) badges.push('Zielfernr.');
    return badges;
  };

  const isLoading = loadingStats || loadingWeapons || loadingVests || loadingAmmo;

  if (isLoading && viewMode === 'overview') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-zinc-400">Laden...</p>
        </div>
      </div>
    );
  }

  // Full view - alle können sehen, nur Leadership kann bearbeiten
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-orange-500/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-600 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Ausrüstungsmanagement</h1>
              <p className="text-zinc-400 mt-1">Waffen, Westen & Munition verwalten</p>
            </div>
          </div>
          
          {canManage && (
            <div className="flex gap-2">
              <Button onClick={() => setShowWeaponModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
                <Swords className="mr-2 h-4 w-4" />
                Waffe eintragen
              </Button>
              <Button onClick={() => setShowVestModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
                <Shield className="mr-2 h-4 w-4" />
                Westen eintragen
              </Button>
              <Button onClick={() => setShowAmmoModal(true)} className="bg-red-600 hover:bg-red-700 text-white">
                <Target className="mr-2 h-4 w-4" />
                Munition eintragen
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => setViewMode('overview')}
          variant={viewMode === 'overview' ? 'default' : 'outline'}
          className={viewMode === 'overview' ? 'bg-orange-600 hover:bg-orange-700 text-zinc-900' : 'border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/50'}
        >
          <Users className="mr-2 h-4 w-4" />
          Übersicht
        </Button>
        <Button
          onClick={() => setViewMode('weapons')}
          variant={viewMode === 'weapons' ? 'default' : 'outline'}
          className={viewMode === 'weapons' ? 'bg-orange-600 hover:bg-orange-700 text-zinc-900' : 'border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/50'}
        >
          <Swords className="mr-2 h-4 w-4" />
          Waffen
        </Button>
        <Button
          onClick={() => setViewMode('vests')}
          variant={viewMode === 'vests' ? 'default' : 'outline'}
          className={viewMode === 'vests' ? 'bg-orange-600 hover:bg-orange-700 text-zinc-900' : 'border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/50'}
        >
          <Shield className="mr-2 h-4 w-4" />
          Westen
        </Button>
        <Button
          onClick={() => setViewMode('ammo')}
          variant={viewMode === 'ammo' ? 'default' : 'outline'}
          className={viewMode === 'ammo' ? 'bg-orange-600 hover:bg-orange-700 text-zinc-900' : 'border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/50'}
        >
          <Target className="mr-2 h-4 w-4" />
          Munition
        </Button>
        <Button
          onClick={() => setViewMode('recommendations')}
          variant={viewMode === 'recommendations' ? 'default' : 'outline'}
          className={viewMode === 'recommendations' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white' : 'border-zinc-700 hover:bg-zinc-800 hover:border-purple-500/50'}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Waffen-Status
        </Button>
      </div>

      {/* Stats */}
      {stats && viewMode === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-orange-500/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Waffen vergeben</p>
                    <p className="text-3xl font-bold text-orange-400">{stats.totalWeapons}</p>
                  </div>
                  <Swords className="h-10 w-10 text-orange-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-orange-500/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Westen-Einträge</p>
                    <p className="text-3xl font-bold text-orange-400">{stats.totalVests}</p>
                  </div>
                  <Shield className="h-10 w-10 text-orange-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-red-500/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Munitions-Einträge</p>
                    <p className="text-3xl font-bold text-red-400">{stats.totalAmmo}</p>
                  </div>
                  <Target className="h-10 w-10 text-red-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-orange-500/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Ohne Waffe</p>
                    <p className="text-3xl font-bold text-orange-400">{stats.usersWithoutWeapons}</p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-orange-500/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {(stats.lowVestUsers?.length > 0 || stats.lowAmmoUsers?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.lowVestUsers?.length > 0 && (
                <Card className="bg-orange-900/20 border-orange-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-orange-400 text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Westen-Warnung (≤3 Tage)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.lowVestUsers.map((u: User) => (
                      <div key={u.id} className="text-orange-200/80 text-sm">
                        {u.icFirstName && u.icLastName ? `${u.icFirstName} ${u.icLastName}` : u.username}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {stats.lowAmmoUsers?.length > 0 && (
                <Card className="bg-red-900/20 border-red-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Munitions-Warnung (≤3 Tage)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.lowAmmoUsers.map((u: User) => (
                      <div key={u.id} className="text-red-200/80 text-sm">
                        {u.icFirstName && u.icLastName ? `${u.icFirstName} ${u.icLastName}` : u.username}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Weapons Table */}
      {(viewMode === 'weapons' || viewMode === 'overview') && (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Swords className="h-5 w-5 text-orange-400" />
              Waffen ({weapons.length})
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Alle vergebenen Waffen
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {weapons.length === 0 ? (
              <div className="py-16 text-center">
                <Swords className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">Keine Waffen eingetragen</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/30">
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mitglied</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Waffe</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aufsätze</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Erhalten</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Letzter Verlust</th>
                      {canManage && <th className="text-right py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aktionen</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {weapons.map((weapon: Weapon) => (
                      <tr key={weapon.id} className="group hover:bg-orange-950/20 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {weapon.user.avatarUrl ? (
                              <img src={weapon.user.avatarUrl} alt={weapon.user.username} className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                <User className="h-4 w-4 text-zinc-400" />
                              </div>
                            )}
                            <span className="font-medium text-white">
                              {weapon.user.icFirstName && weapon.user.icLastName 
                                ? `${weapon.user.icFirstName} ${weapon.user.icLastName}` 
                                : weapon.user.username}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                            {WEAPON_TYPE_NAMES[weapon.weaponType] || weapon.weaponType}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {getAttachmentBadges(weapon).map(badge => (
                              <Badge key={badge} variant="outline" className="text-xs bg-zinc-700/50 border-zinc-600 text-zinc-300">
                                {badge}
                              </Badge>
                            ))}
                            {getAttachmentBadges(weapon).length === 0 && (
                              <span className="text-zinc-500 text-sm">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-zinc-300 text-sm">{formatDate(weapon.receivedAt)}</span>
                        </td>
                        <td className="py-4 px-4">
                          {weapon.lastLostAt ? (
                            <span className="text-red-400 text-sm">{formatDate(weapon.lastLostAt)}</span>
                          ) : (
                            <span className="text-zinc-500 text-sm">-</span>
                          )}
                        </td>
                        {canManage && (
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditWeapon(weapon)}
                                className="h-8 px-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Waffe wirklich löschen?')) {
                                    deleteWeaponMutation.mutate(weapon.id);
                                  }
                                }}
                                className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vests Table */}
      {(viewMode === 'vests' || viewMode === 'overview') && (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-400" />
              Westen ({vests.length})
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Westen-Zuteilungen (1 Weste pro Tag)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {vests.length === 0 ? (
              <div className="py-16 text-center">
                <Shield className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">Keine Westen eingetragen</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/30">
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mitglied</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Anzahl</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Erhalten</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Verbraucht bis</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tage übrig</th>
                      {canManage && <th className="text-right py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aktionen</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {vests.map((vest: Vest) => {
                      const daysRemaining = getDaysRemaining(vest.expectedEmptyAt);
                      return (
                        <tr key={vest.id} className="group hover:bg-orange-950/20 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {vest.user.avatarUrl ? (
                                <img src={vest.user.avatarUrl} alt={vest.user.username} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                  <User className="h-4 w-4 text-zinc-400" />
                                </div>
                              )}
                              <span className="font-medium text-white">
                                {vest.user.icFirstName && vest.user.icLastName 
                                  ? `${vest.user.icFirstName} ${vest.user.icLastName}` 
                                  : vest.user.username}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                              {vest.quantity} Westen
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-zinc-300 text-sm">{formatDate(vest.receivedAt)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-zinc-300 text-sm">{formatDate(vest.expectedEmptyAt)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={`${
                              daysRemaining <= 3 ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                              daysRemaining <= 7 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                              'bg-green-500/20 text-green-300 border-green-500/30'
                            }`}>
                              {daysRemaining > 0 ? `${daysRemaining} Tage` : 'Verbraucht'}
                            </Badge>
                          </td>
                          {canManage && (
                            <td className="py-4 px-6 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Eintrag wirklich löschen?')) {
                                    deleteVestMutation.mutate(vest.id);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ammo Table */}
      {(viewMode === 'ammo' || viewMode === 'overview') && (
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-red-400" />
              Munition ({ammo.length})
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Munitions-Zuteilungen (2 Pakete pro Tag)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {ammo.length === 0 ? (
              <div className="py-16 text-center">
                <Target className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">Keine Munition eingetragen</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/30">
                      <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mitglied</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Anzahl</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Erhalten</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Verbraucht bis</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tage übrig</th>
                      {canManage && <th className="text-right py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aktionen</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {ammo.map((a: Ammo) => {
                      const daysRemaining = getDaysRemaining(a.expectedEmptyAt);
                      return (
                        <tr key={a.id} className="group hover:bg-red-950/20 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {a.user.avatarUrl ? (
                                <img src={a.user.avatarUrl} alt={a.user.username} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                  <User className="h-4 w-4 text-zinc-400" />
                                </div>
                              )}
                              <span className="font-medium text-white">
                                {a.user.icFirstName && a.user.icLastName 
                                  ? `${a.user.icFirstName} ${a.user.icLastName}` 
                                  : a.user.username}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                              {a.quantity} Pakete
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-zinc-300 text-sm">{formatDate(a.receivedAt)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-zinc-300 text-sm">{formatDate(a.expectedEmptyAt)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={`${
                              daysRemaining <= 3 ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                              daysRemaining <= 7 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                              'bg-green-500/20 text-green-300 border-green-500/30'
                            }`}>
                              {daysRemaining > 0 ? `${daysRemaining} Tage` : 'Verbraucht'}
                            </Badge>
                          </td>
                          {canManage && (
                            <td className="py-4 px-6 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Eintrag wirklich löschen?')) {
                                    deleteAmmoMutation.mutate(a.id);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weapon Modal */}
      {showWeaponModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-orange-500/20 to-orange-600/20 blur-xl rounded-2xl" />
            <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-orange-500/30 shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Swords className="h-5 w-5 text-orange-400" />
                  {editingWeapon ? 'Waffe bearbeiten' : 'Waffe eintragen'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleWeaponSubmit} className="space-y-4">
                  {/* User Search */}
                  {!editingWeapon && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <User className="h-4 w-4 text-orange-400" />
                        Mitglied auswählen
                      </label>
                      {selectedUserId ? (
                        getSelectedUserDisplay()
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                          <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Name suchen..."
                            className="bg-zinc-800/50 border-zinc-700 pl-10 text-white h-11 focus:border-orange-500"
                          />
                          {searchResults.length > 0 && searchQuery.length >= 2 && (
                            <div className="absolute z-10 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 max-h-64 overflow-y-auto">
                              <div className="p-2 border-b border-zinc-700/50">
                                <span className="text-xs text-zinc-500 uppercase tracking-wider px-2">
                                  {searchResults.length} Ergebnisse
                                </span>
                              </div>
                              {searchResults.map((u: User) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => selectUser(u.id)}
                                  className="w-full px-3 py-3 flex items-center gap-3 hover:bg-orange-500/10 transition-all text-left border-b border-zinc-800/50 last:border-0"
                                >
                                  {u.avatarUrl ? (
                                    <img src={u.avatarUrl} alt={u.username} className="w-10 h-10 rounded-xl ring-2 ring-zinc-700" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center ring-2 ring-zinc-700">
                                      <User className="h-5 w-5 text-zinc-400" />
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-white font-medium">
                                      {u.icFirstName && u.icLastName ? `${u.icFirstName} ${u.icLastName}` : u.username}
                                    </span>
                                    <span className="text-xs text-zinc-500">@{u.username}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Weapon Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Crosshair className="h-4 w-4 text-orange-400" />
                      Waffentyp
                    </label>
                    <Select
                      value={weaponData.weaponType}
                      onValueChange={(value) => setWeaponData({ ...weaponData, weaponType: value })}
                    >
                      <SelectTrigger className="w-full h-11 bg-zinc-800/50 border-zinc-700 text-white hover:border-orange-500/50 focus:border-orange-500 focus:ring-orange-500/20">
                        <SelectValue placeholder="Waffentyp auswählen">
                          <div className="flex items-center gap-2">
                            <span className="text-orange-400">⚔️</span>
                            <span>{WEAPON_TYPE_NAMES[weaponData.weaponType] || weaponData.weaponType}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700 shadow-xl shadow-black/50">
                        {weaponTypes.map((type: WeaponType) => (
                          <SelectItem 
                            key={type.key} 
                            value={type.key}
                            className="text-white hover:bg-orange-500/20 focus:bg-orange-500/20 focus:text-orange-300 cursor-pointer py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">
                                {type.key === 'SMG' && '🔫'}
                                {type.key === 'ADV' && '🎯'}
                                {type.key === 'KARABINER' && '🔫'}
                                {type.key === 'SPEZIALKARABINER' && '⚡'}
                                {type.key === 'PDW' && '💥'}
                                {type.key === 'AK47' && '🔥'}
                                {type.key === 'TOMMY_GUN' && '🎺'}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-medium">{type.name}</span>
                                <span className="text-xs text-zinc-400">{type.description}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-400" />
                        Erhalten am
                      </label>
                      <Input
                        type="date"
                        value={weaponData.receivedAt}
                        onChange={(e) => setWeaponData({ ...weaponData, receivedAt: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 text-white h-11 focus:border-green-500 focus:ring-green-500/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        Letzter Verlust
                      </label>
                      <Input
                        type="date"
                        value={weaponData.lastLostAt}
                        onChange={(e) => setWeaponData({ ...weaponData, lastLostAt: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 text-white h-11 focus:border-red-500 focus:ring-red-500/20"
                      />
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-400" />
                      Aufsätze
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'hasTaschenlampe', label: 'Taschenlampe', icon: '🔦', desc: 'Beleuchtung' },
                        { key: 'hasTrommelmagazin', label: 'Trommelmagazin', icon: '🥁', desc: 'Mehr Kapazität' },
                        { key: 'hasSchalldaempfer', label: 'Schalldämpfer', icon: '🔇', desc: 'Leiser' },
                        { key: 'hasGriff', label: 'Griff', icon: '✊', desc: 'Bessere Kontrolle' },
                        { key: 'hasErwMagazin', label: 'Erw. Magazin', icon: '📦', desc: '+50% Kapazität' },
                        { key: 'hasZielfernrohr', label: 'Zielfernrohr', icon: '🎯', desc: 'Präzision' },
                      ].map(att => {
                        const isChecked = weaponData[att.key as keyof typeof weaponData] as boolean;
                        return (
                          <label 
                            key={att.key} 
                            className={`
                              relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border
                              ${isChecked 
                                ? 'bg-orange-500/20 border-orange-500/50 shadow-lg shadow-orange-500/10' 
                                : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/50'
                              }
                            `}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => 
                                setWeaponData({ ...weaponData, [att.key]: checked })
                              }
                              className={isChecked ? 'border-orange-500 data-[state=checked]:bg-orange-500' : ''}
                            />
                            <span className="text-xl">{att.icon}</span>
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${isChecked ? 'text-orange-300' : 'text-zinc-300'}`}>
                                {att.label}
                              </span>
                              <span className="text-xs text-zinc-500">{att.desc}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Note */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Notiz (optional)</label>
                    <Textarea
                      value={weaponData.note}
                      onChange={(e) => setWeaponData({ ...weaponData, note: e.target.value })}
                      placeholder="Zusätzliche Informationen..."
                      className="!bg-zinc-800/50 border-zinc-700 text-white resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={resetWeaponForm} className="flex-1 border-zinc-600 hover:bg-zinc-800 text-zinc-300">
                      Abbrechen
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                      disabled={(!selectedUserId && !editingWeapon) || createWeaponMutation.isPending || updateWeaponMutation.isPending}
                    >
                      {editingWeapon ? 'Speichern' : 'Eintragen'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Vest Modal */}
      {showVestModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-orange-500/20 to-orange-600/20 blur-xl rounded-2xl" />
            <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-orange-500/30 shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-400" />
                  Westen eintragen
                </CardTitle>
                <CardDescription className="text-orange-200/70">
                  Verbrauch: 1 Weste pro Tag
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVestSubmit} className="space-y-4">
                  {/* User Search */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <User className="h-4 w-4 text-orange-400" />
                      Mitglied auswählen
                    </label>
                    {selectedUserId ? (
                      getSelectedUserDisplay()
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Name suchen..."
                          className="bg-zinc-800/50 border-zinc-700 pl-10 text-white h-11 focus:border-orange-500"
                        />
                        {searchResults.length > 0 && searchQuery.length >= 2 && (
                          <div className="absolute z-10 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 max-h-64 overflow-y-auto">
                            <div className="p-2 border-b border-zinc-700/50">
                              <span className="text-xs text-zinc-500 uppercase tracking-wider px-2">
                                {searchResults.length} Ergebnisse
                              </span>
                            </div>
                            {searchResults.map((u: User) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => selectUser(u.id)}
                                className="w-full px-3 py-3 flex items-center gap-3 hover:bg-orange-500/10 transition-all text-left border-b border-zinc-800/50 last:border-0"
                              >
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt={u.username} className="w-10 h-10 rounded-xl ring-2 ring-zinc-700" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center ring-2 ring-zinc-700">
                                    <User className="h-5 w-5 text-zinc-400" />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-white font-medium">
                                    {u.icFirstName && u.icLastName ? `${u.icFirstName} ${u.icLastName}` : u.username}
                                  </span>
                                  <span className="text-xs text-zinc-500">@{u.username}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-400" />
                        Anzahl Westen
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={vestData.quantity}
                        onChange={(e) => setVestData({ ...vestData, quantity: parseInt(e.target.value) || 1 })}
                        className="bg-zinc-800/50 border-zinc-700 text-white h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-400" />
                        Erhalten am
                      </label>
                      <Input
                        type="date"
                        value={vestData.receivedAt}
                        onChange={(e) => setVestData({ ...vestData, receivedAt: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 text-white h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-orange-500/10 to-orange-500/10 border border-orange-500/30 rounded-xl">
                    <p className="text-orange-300 text-sm flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Clock className="h-5 w-5 text-orange-400" />
                      </div>
                      Voraussichtlich verbraucht in <strong>{vestData.quantity}</strong> Tagen
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Notiz (optional)</label>
                    <Textarea
                      value={vestData.note}
                      onChange={(e) => setVestData({ ...vestData, note: e.target.value })}
                      placeholder="Zusätzliche Informationen..."
                      className="!bg-zinc-800/50 border-zinc-700 text-white resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={resetVestForm} className="flex-1 border-zinc-600 hover:bg-zinc-800 text-zinc-300">
                      Abbrechen
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                      disabled={!selectedUserId || createVestMutation.isPending}
                    >
                      Eintragen
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* === Recommendations View (Ampelsystem) === */}
      {viewMode === 'recommendations' && (
        <div className="space-y-6">
          {/* Stats Overview */}
          {recommendationsData?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Card className="bg-zinc-800/50 border-zinc-700/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{recommendationsData.stats.total}</p>
                  <p className="text-xs text-zinc-400 mt-1">Gesamt</p>
                </CardContent>
              </Card>
              <Card className="bg-green-900/30 border-green-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{recommendationsData.stats.withWeapon}</p>
                  <p className="text-xs text-green-400/70 mt-1">Mit Waffe</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-800/50 border-zinc-700/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-zinc-300">{recommendationsData.stats.withoutWeapon}</p>
                  <p className="text-xs text-zinc-400 mt-1">Ohne Waffe</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-900/30 border-purple-500/50 ring-1 ring-purple-500/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">{recommendationsData.stats.priority}</p>
                  <p className="text-xs text-purple-400/70 mt-1">SICARIO</p>
                </CardContent>
              </Card>
              <Card className="bg-red-900/30 border-red-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{recommendationsData.stats.red}</p>
                  <p className="text-xs text-red-400/70 mt-1">&gt;4 Wochen</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-900/30 border-orange-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-orange-400">{recommendationsData.stats.yellow}</p>
                  <p className="text-xs text-orange-400/70 mt-1">2-4 Wochen</p>
                </CardContent>
              </Card>
              <Card className="bg-green-900/30 border-green-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{recommendationsData.stats.green}</p>
                  <p className="text-xs text-green-400/70 mt-1">&lt;2 Wochen</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Legend */}
          <Card className="bg-zinc-800/30 border-zinc-700/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <span className="text-zinc-400 font-medium">Legende:</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse"></div>
                  <span className="text-purple-300">SICARIO - Sofort!</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-red-300">&gt;4 Wochen ohne Waffe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-orange-300">2-4 Wochen ohne Waffe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-green-300">&lt;2 Wochen / Hat Waffe</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Table */}
          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardHeader className="border-b border-zinc-800/50">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-purple-400" />
                Waffen-Empfehlungen (Ampelsystem)
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Basierend auf Blood-In Datum und Sicario-Status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRecommendations ? (
                <div className="py-16 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-zinc-400">Lade Empfehlungen...</p>
                </div>
              ) : !recommendationsData?.recommendations?.length ? (
                <div className="py-16 text-center">
                  <TrendingUp className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-400">Keine aktiven Mitglieder gefunden</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-800/30">
                        <th className="text-left py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                        <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mitglied</th>
                        <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Blood-In</th>
                        <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tage</th>
                        <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sicario</th>
                        <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Hat Waffe</th>
                        <th className="text-left py-4 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Empfehlung</th>
                        {canManage && <th className="text-right py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aktion</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {(recommendationsData.recommendations as Recommendation[]).map((rec) => (
                        <tr 
                          key={rec.bloodRecord.id} 
                          className={`group transition-colors ${
                            rec.status === 'priority' ? 'bg-purple-950/30 hover:bg-purple-950/50' :
                            rec.status === 'red' ? 'bg-red-950/20 hover:bg-red-950/30' :
                            rec.status === 'yellow' ? 'bg-orange-950/10 hover:bg-orange-950/20' :
                            'hover:bg-zinc-800/30'
                          }`}
                        >
                          <td className="py-4 px-6">
                            {rec.status === 'priority' ? (
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <Zap className="h-6 w-6 text-purple-400 animate-pulse" />
                                  <div className="absolute inset-0 h-6 w-6 bg-purple-400/30 rounded-full animate-ping"></div>
                                </div>
                              </div>
                            ) : rec.status === 'red' ? (
                              <XCircle className="h-6 w-6 text-red-400" />
                            ) : rec.status === 'yellow' ? (
                              <AlertCircle className="h-6 w-6 text-orange-400" />
                            ) : (
                              <CheckCircle2 className="h-6 w-6 text-green-400" />
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {rec.user?.avatarUrl ? (
                                <img src={rec.user.avatarUrl} alt={rec.user.username} className="w-10 h-10 rounded-full ring-2 ring-zinc-700" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center ring-2 ring-zinc-600">
                                  <User className="h-5 w-5 text-zinc-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-white">
                                  {rec.bloodRecord.vorname} {rec.bloodRecord.nachname}
                                </p>
                                {rec.user && (
                                  <p className="text-xs text-zinc-500">@{rec.user.username}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-zinc-300 text-sm">
                              {new Date(rec.bloodRecord.bloodinTimestamp).toLocaleDateString('de-DE')}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {rec.hasWeapon ? (
                              <span className="text-zinc-500">-</span>
                            ) : (
                              <Badge className={`${
                                rec.daysSinceBloodIn >= 28 ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                rec.daysSinceBloodIn >= 14 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                                'bg-zinc-600/30 text-zinc-300 border-zinc-500/30'
                              }`}>
                                {rec.daysSinceBloodIn} Tage
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {rec.isSicario ? (
                              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 flex items-center gap-1 w-fit">
                                <Crosshair className="h-3 w-3" />
                                SICARIO
                              </Badge>
                            ) : (
                              <span className="text-zinc-500">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {rec.hasWeapon ? (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" />
                                Ja
                              </Badge>
                            ) : (
                              <Badge className="bg-zinc-600/30 text-zinc-400 border-zinc-500/30">
                                Nein
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={`${
                              rec.status === 'priority' ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 border-purple-400/50 animate-pulse' :
                              rec.status === 'red' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                              rec.status === 'yellow' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                              'bg-green-500/20 text-green-300 border-green-500/30'
                            }`}>
                              {rec.statusText}
                            </Badge>
                          </td>
                          {canManage && (
                            <td className="py-4 px-6 text-right">
                              {!rec.hasWeapon && rec.user && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserId(rec.user!.id);
                                    setShowWeaponModal(true);
                                  }}
                                  className="bg-orange-600 hover:bg-orange-700 text-zinc-900"
                                >
                                  <Swords className="h-4 w-4 mr-1" />
                                  Waffe zuweisen
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ammo Modal */}
      {showAmmoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-red-500/20 to-red-600/20 blur-xl rounded-2xl" />
            <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-red-500/30 shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-400" />
                  Munition eintragen
                </CardTitle>
                <CardDescription className="text-red-200/70">
                  Verbrauch: 2 Pakete pro Tag
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAmmoSubmit} className="space-y-4">
                  {/* User Search */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <User className="h-4 w-4 text-red-400" />
                      Mitglied auswählen
                    </label>
                    {selectedUserId ? (
                      getSelectedUserDisplay()
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Name suchen..."
                          className="bg-zinc-800/50 border-zinc-700 pl-10 text-white h-11 focus:border-red-500"
                        />
                        {searchResults.length > 0 && searchQuery.length >= 2 && (
                          <div className="absolute z-10 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 max-h-64 overflow-y-auto">
                            <div className="p-2 border-b border-zinc-700/50">
                              <span className="text-xs text-zinc-500 uppercase tracking-wider px-2">
                                {searchResults.length} Ergebnisse
                              </span>
                            </div>
                            {searchResults.map((u: User) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => selectUser(u.id)}
                                className="w-full px-3 py-3 flex items-center gap-3 hover:bg-red-500/10 transition-all text-left border-b border-zinc-800/50 last:border-0"
                              >
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt={u.username} className="w-10 h-10 rounded-xl ring-2 ring-zinc-700" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center ring-2 ring-zinc-700">
                                    <User className="h-5 w-5 text-zinc-400" />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-white font-medium">
                                    {u.icFirstName && u.icLastName ? `${u.icFirstName} ${u.icLastName}` : u.username}
                                  </span>
                                  <span className="text-xs text-zinc-500">@{u.username}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Target className="h-4 w-4 text-red-400" />
                        Anzahl Pakete
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={ammoData.quantity}
                        onChange={(e) => setAmmoData({ ...ammoData, quantity: parseInt(e.target.value) || 1 })}
                        className="bg-zinc-800/50 border-zinc-700 text-white h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-red-400" />
                        Erhalten am
                      </label>
                      <Input
                        type="date"
                        value={ammoData.receivedAt}
                        onChange={(e) => setAmmoData({ ...ammoData, receivedAt: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-red-300 text-sm flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <Clock className="h-5 w-5 text-red-400" />
                      </div>
                      Voraussichtlich verbraucht in <strong className="text-red-200 mx-1">{Math.ceil(ammoData.quantity / 2)}</strong> Tagen
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Notiz (optional)</label>
                    <Textarea
                      value={ammoData.note}
                      onChange={(e) => setAmmoData({ ...ammoData, note: e.target.value })}
                      placeholder="Zusätzliche Informationen..."
                      className="!bg-zinc-800/50 border-zinc-700 text-white resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={resetAmmoForm} className="flex-1 border-zinc-600 hover:bg-zinc-800 text-zinc-300">
                      Abbrechen
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      disabled={!selectedUserId || createAmmoMutation.isPending}
                    >
                      Eintragen
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
