/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import {
  LayoutDashboard,
  Trophy,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  Users,
  LogOut,
  UsersRound,
  X,
  History,
  CheckCircle2,
  Database,
  Clock,
  ShoppingCart,
  Zap,
  Banknote,
  Trash2,
  ShieldAlert,
  Archive,
  Search,
  ChevronDown,
  AlertTriangle,
  Menu,
} from 'lucide-react';
import { signOut } from "next-auth/react";
import SiteFooter from "./SiteFooter";
import { getCashbackPercentage, ROLES_HIERARCHY } from "@/lib/roles";

const TAB_TITLES: Record<string, string> = {
  inicio: 'Visão geral',
  ranking: 'Ranking',
  equipe: 'Efetivo',
  gestao: 'Mural',
  registrar: 'Postar',
  pendencias: 'Pendências',
  admin: 'Aprovações',
  admin_zone: 'Administração',
  historico_backup: 'Histórico',
};

const formatCurrency = (value: number | string) => {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatMonthName = (yearMonth: string) => {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-');
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
};

const getGrossValue = (r: any) => Number(r.amount ?? r.valor ?? 0);
const getNetValue = (r: any) => Number(r.receivedAmount ?? r.valorRecebido ?? 0);
const getBonusValue = (r: any) => Number(r.extraCashback ?? r.cashbackExtra ?? 0);
const getPaidValue = (r: any) => Number(r.amount ?? r.valor ?? 0);

const getDisplayItemName = (record: any) => {
  if ((record.type === 'CORRIDINHA' || record.tipo === 'CORRIDINHA') && (!record.item || record.item === 'N/A')) return 'BÔNUS: CORRIDINHA MALUCA';
  if ((record.type === 'SAQUE' || record.tipo === 'SAQUE') && (!record.item || record.item === 'N/A')) return 'PAGAMENTO REALIZADO';
  return record.item !== 'N/A' ? record.item : (record.type || record.tipo);
};

const getDisplayClientName = (record: any) => {
  if ((record.type === 'CORRIDINHA' || record.tipo === 'CORRIDINHA') && (!record.client && !record.cliente || record.client === 'N/A' || record.cliente === 'N/A')) return 'EQUIPE AFL';
  if ((record.type === 'SAQUE' || record.tipo === 'SAQUE') && (!record.client && !record.cliente || record.client === 'N/A' || record.cliente === 'N/A')) return 'FINANCEIRO AFL';
  return (record.client && record.client !== 'N/A') ? record.client : (record.cliente && record.cliente !== 'N/A') ? record.cliente : 'SISTEMA';
};

const isInstallmentPayment = (itemName: string) => {
  return (itemName || '').toUpperCase().includes('PAGAMENTO DE PARCELA');
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || 'Falha ao carregar dados.');
  }

  return data;
};

const TooltipText = ({ text, maxWidth = "150px" }: { text: string, maxWidth?: string }) => (
  <div className="group relative inline-block max-w-full align-bottom">
    <span className="block truncate cursor-help" style={{ maxWidth }} title={text}>
      {text}
    </span>
    <div
      className="pointer-events-none invisible absolute left-0 top-full z-[99999] mt-2 w-max max-w-[280px] rounded-2xl border px-3 py-2 text-xs opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100"
      style={{
        background: 'var(--bg-elevated)',
        color: 'var(--ink)',
        borderColor: 'var(--line)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {text}
    </div>
  </div>
);

export default function Dashboard({ initialPermissions, userSession }: any) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [selectedRole, setSelectedRole] = useState('Todos');
  const isAdmin = Boolean(initialPermissions?.isAdmin);
  const isMaster = Boolean(initialPermissions?.isMaster);
  const canPostSales = Boolean(initialPermissions?.canPostSales);
  const canPostExtras = Boolean(initialPermissions?.canPostExtras ?? (initialPermissions?.isAdmin || initialPermissions?.isMaster));
  const canApproveRecords = Boolean(initialPermissions?.canApproveRecords);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [muralSearchQuery, setMuralSearchQuery] = useState('');
  const [muralPaginationLimit, setMuralPaginationLimit] = useState(20);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logPaginationLimit, setLogPaginationLimit] = useState(20);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyPaginationLimit, setHistoryPaginationLimit] = useState(20);

  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [installmentModalData, setInstallmentModalData] = useState<any>(null);
  const [confirmationModalData, setConfirmationModalData] = useState<{ aberto: boolean; titulo: string; mensagem: string; acao: () => void; tipo?: 'perigo' | 'aviso'; } | null>(null);

  const [installmentValue, setInstallmentValue] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [backupMonth, setBackupMonth] = useState('');

  const [formData, setFormData] = useState({
    type: 'VENDA', vendorId: '', client: '', item: '',
    amount: '', receivedAmount: '', recruitedId: '', dueDate: '', memberWithdrawalId: ''
  });

  const displayToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentDate = new Date();
  const currentMonthString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const { data: teamData, mutate: mutateTeam } = useSWR('/api/equipe', fetcher, { refreshInterval: 5000 });
  const { data: recordsData, mutate: mutateRecords } = useSWR('/api/records', fetcher, { refreshInterval: 5000 });

  // BLINDAGEM: Garante que mesmo se a API der erro, a tela recebe uma lista limpa e não quebra com o "map is not a function"
  const teamMembers = Array.isArray(teamData) ? teamData : [];
  const records = Array.isArray(recordsData) ? recordsData : [];
  const isInitialLoad = (!teamData && !recordsData);

  const forceDataSync = useCallback(async () => {
    await Promise.all([mutateTeam(), mutateRecords()]);
  }, [mutateTeam, mutateRecords]);

  useEffect(() => {
    if (teamMembers.length > 0 && userSession?.user?.id) {
      const loggedUser = teamMembers.find((m: any) => String(m.discordId) === String(userSession.user.id));
      if (loggedUser) {
        const userCurrentRole = loggedUser.panelRole || loggedUser.role || "";
        if (!ROLES_HIERARCHY.includes(userCurrentRole)) {
          signOut({ callbackUrl: '/login' });
        }
      }
    }
  }, [teamMembers, userSession]);

  useEffect(() => {
    if (records.length > 0 && !backupMonth) {
      const firstRecordDate = new Date(records[0].createdAt || records[0].criado_em);
      setBackupMonth(`${firstRecordDate.getFullYear()}-${String(firstRecordDate.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [records, backupMonth]);

  const loggedInMember = useMemo(() => teamMembers.find((m: any) => String(m.discordId) === String(userSession?.user?.id)), [teamMembers, userSession]);
  const displayUserName = loggedInMember?.nome || loggedInMember?.name || userSession?.user?.name || 'Agente';
  const displayUserAvatar = loggedInMember?.avatar || userSession?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUserName)}&background=EAB308&color=000&bold=true`;
  const canSelectAnySeller = isAdmin || isMaster;
  const roleLabel = isAdmin
    ? 'Administrador'
    : (loggedInMember?.panelRole || loggedInMember?.role || (isMaster ? 'Master AFL' : 'Agente AFL'));

  const dashboardMesAtual = useMemo(() => records.filter((r: any) =>
    (r.status === 'APROVADO' || r.status === 'ARQUIVADO') &&
    (r.createdAt || r.criado_em)?.startsWith(currentMonthString)
  ), [records, currentMonthString]);

  const globalStats = useMemo(() => {
    const totalGross = dashboardMesAtual
      .filter((r: any) => (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && !(r.item || '').toUpperCase().includes('DÍVIDA ANTIGA') && !isInstallmentPayment(r.item))
      .reduce((acc: number, r: any) => acc + getGrossValue(r), 0);

    const netSales = dashboardMesAtual
      .filter((r: any) => (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && !isInstallmentPayment(r.item))
      .reduce((acc: number, r: any) => acc + getNetValue(r), 0);

    const netInstallments = dashboardMesAtual
      .filter((r: any) => isInstallmentPayment(r.item))
      .reduce((acc: number, r: any) => acc + (getGrossValue(r) || getNetValue(r) || getBonusValue(r)), 0);

    return { gross: totalGross, net: netSales + netInstallments };
  }, [dashboardMesAtual]);

  const backupStats = useMemo(() => {
    const backupMonthRecords = records.filter((r: any) =>
      (r.status === 'APROVADO' || r.status === 'ARQUIVADO') &&
      (r.createdAt || r.criado_em)?.startsWith(backupMonth)
    );

    const totalGross = backupMonthRecords
      .filter((r: any) => (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && !(r.item || '').toUpperCase().includes('DÍVIDA ANTIGA') && !isInstallmentPayment(r.item))
      .reduce((acc: number, r: any) => acc + getGrossValue(r), 0);

    const netSales = backupMonthRecords
      .filter((r: any) => (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && !isInstallmentPayment(r.item))
      .reduce((acc: number, r: any) => acc + getNetValue(r), 0);

    const netInstallments = backupMonthRecords
      .filter((r: any) => isInstallmentPayment(r.item))
      .reduce((acc: number, r: any) => acc + (getGrossValue(r) || getNetValue(r) || getBonusValue(r)), 0);

    return { gross: totalGross, net: netSales + netInstallments };
  }, [records, backupMonth]);

  const processedTeam = useMemo(() => {
    if (!teamMembers.length) return [];

    return teamMembers.map((member: any) => {
      const actualRole = member.panelRole || member.cargoPainel || member.role || member.cargo || 'Membro AFL';
      const commissionRate = getCashbackPercentage(actualRole);

      const currentMonthRecords = records.filter((r: any) =>
        String(r.discordId) === String(member.discordId) &&
        (r.status === 'APROVADO' || r.status === 'ARQUIVADO') &&
        (r.createdAt || r.criado_em)?.startsWith(currentMonthString)
      );

      const grossSales = currentMonthRecords
        .filter((r: any) => (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && !(r.item || '').toUpperCase().includes('DÍVIDA ANTIGA') && !isInstallmentPayment(r.item))
        .reduce((acc: number, r: any) => acc + getGrossValue(r), 0);

      const netSales = currentMonthRecords
        .filter((r: any) => (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && !isInstallmentPayment(r.item))
        .reduce((acc: number, r: any) => acc + getNetValue(r), 0);

      const netInstallments = currentMonthRecords
        .filter((r: any) => isInstallmentPayment(r.item))
        .reduce((acc: number, r: any) => acc + (getGrossValue(r) || getNetValue(r) || getBonusValue(r)), 0);

      const totalNet = netSales + netInstallments;

      const bonusEarned = currentMonthRecords
        .filter((r: any) => (r.type === 'CORRIDINHA' || r.tipo === 'CORRIDINHA') && !(r.item || '').toUpperCase().includes('SALDO RETIDO'))
        .reduce((acc: number, r: any) => acc + getBonusValue(r), 0);

      const amountPaid = currentMonthRecords
        .filter((r: any) => (r.type === 'SAQUE' || r.tipo === 'SAQUE') && !(r.item || '').toUpperCase().includes('DÍVIDA RETIDA'))
        .reduce((acc: number, r: any) => acc + getPaidValue(r), 0);

      const activeRecords = records.filter((r: any) => String(r.discordId) === String(member.discordId) && r.status === 'APROVADO');

      const activeNetSales = activeRecords
        .filter((r: any) => (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && !isInstallmentPayment(r.item))
        .reduce((acc: number, r: any) => acc + getNetValue(r), 0);

      const activeNetInstallments = activeRecords
        .filter((r: any) => isInstallmentPayment(r.item))
        .reduce((acc: number, r: any) => acc + (getGrossValue(r) || getNetValue(r) || getBonusValue(r)), 0);

      const activeNet = activeNetSales + activeNetInstallments;

      const activeBonus = activeRecords
        .filter((r: any) => (r.type === 'CORRIDINHA' || r.tipo === 'CORRIDINHA'))
        .reduce((acc: number, r: any) => acc + getBonusValue(r), 0);

      const activePaid = activeRecords
        .filter((r: any) => (r.type === 'SAQUE' || r.tipo === 'SAQUE'))
        .reduce((acc: number, r: any) => acc + getPaidValue(r), 0);

      const finalBalance = (activeNet * commissionRate) + activeBonus - activePaid;

      return {
        ...member,
        actualRole,
        grossSales,
        totalNet,
        bonusEarned,
        amountPaid,
        finalBalance
      };
    }).sort((a: any, b: any) => b.grossSales - a.grossSales);
  }, [teamMembers, records, currentMonthString]);

  const activeTeam = useMemo(() => {
    return processedTeam.filter((m: any) => ROLES_HIERARCHY.includes(m.actualRole));
  }, [processedTeam]);

  const filteredTeam = useMemo(() => {
    return selectedRole === 'Todos' ? activeTeam : activeTeam.filter((m: any) => m.actualRole === selectedRole);
  }, [activeTeam, selectedRole]);

  const pendingRecords = useMemo(() => {
    return records.filter((r: any) => r.status === 'PENDENTE');
  }, [records]);

  const pendingInstallments = useMemo(() => {
    return records
      .filter((r: any) => (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && getNetValue(r) < getGrossValue(r))
      .sort((a: any, b: any) => String(a.dueDate || a.dataVencimento || '9999').localeCompare(String(b.dueDate || b.dataVencimento || '9999')));
  }, [records]);

  const filteredMural = useMemo(() => {
    return records.filter((r: any) =>
      (r.status === 'APROVADO' || r.status === 'ARQUIVADO') &&
      (r.createdAt || r.criado_em)?.startsWith(currentMonthString) &&
      !(r.item || '').toUpperCase().includes('SALDO RETIDO') &&
      !(r.item || '').toUpperCase().includes('DÍVIDA RETIDA')
    ).filter((r: any) => {
      if (muralSearchQuery === '') return true;
      const term = muralSearchQuery.toLowerCase();
      return getDisplayClientName(r).toLowerCase().includes(term) ||
             getDisplayItemName(r).toLowerCase().includes(term) ||
             (r.name || r.nome || '').toLowerCase().includes(term);
    }).sort((a: any, b: any) => new Date(b.createdAt || b.criado_em).getTime() - new Date(a.createdAt || a.criado_em).getTime());
  }, [records, currentMonthString, muralSearchQuery]);

  const filteredLogs = useMemo(() => {
    return records.filter((r: any) => r.status === 'APROVADO').filter((r: any) => {
      if (logSearchQuery === '') return true;
      const term = logSearchQuery.toLowerCase();
      return (r.name || r.nome || '').toLowerCase().includes(term) ||
             (r.item || '').toLowerCase().includes(term) ||
             (r.type || r.tipo || '').toLowerCase().includes(term);
    }).sort((a: any, b: any) => new Date(b.createdAt || b.criado_em).getTime() - new Date(a.createdAt || a.criado_em).getTime());
  }, [records, logSearchQuery]);

  const availableMonths = useMemo(() => {
    return Array.from(new Set(records.map((r: any) => (r.createdAt || r.criado_em)?.substring(0, 7)))).filter(Boolean).sort().reverse();
  }, [records]);

  const filteredHistory = useMemo(() => {
    return records.filter((r: any) => (r.createdAt || r.criado_em)?.startsWith(backupMonth)).filter((r: any) => {
      if (historySearchQuery === '') return true;
      const term = historySearchQuery.toLowerCase();
      return (r.name || r.nome || '').toLowerCase().includes(term) ||
             (r.item || '').toLowerCase().includes(term) ||
             (r.type || r.tipo || '').toLowerCase().includes(term);
    }).sort((a: any, b: any) => new Date(b.createdAt || b.criado_em).getTime() - new Date(a.createdAt || a.criado_em).getTime());
  }, [records, backupMonth, historySearchQuery]);

  const maxGrossChart = useMemo(() => {
    return Math.max(...activeTeam.map((m: any) => m.grossSales), 1);
  }, [activeTeam]);

  const activeModalMember = useMemo(() => {
    return selectedMember ? processedTeam.find((m: any) => m.discordId === selectedMember.discordId) || selectedMember : null;
  }, [selectedMember, processedTeam]);

  const parsedTotalValue = parseFloat(formData.amount.replace(',', '.')) || 0;
  const parsedReceivedValue = formData.receivedAmount !== '' ? parseFloat(formData.receivedAmount.replace(',', '.')) : parsedTotalValue;
  const requireDueDate = parsedReceivedValue < parsedTotalValue;

  useEffect(() => {
    if (!canPostSales) return;

    if (loggedInMember?.discordId && !canSelectAnySeller) {
      setFormData((current) => ({
        ...current,
        vendorId: String(loggedInMember.discordId),
        recruitedId: String(loggedInMember.discordId),
        memberWithdrawalId: String(loggedInMember.discordId),
        type: 'VENDA',
      }));
    }
  }, [canPostSales, canSelectAnySeller, loggedInMember]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    const responsibleMember = activeTeam.find((m: any) => String(m.discordId) === String(formData.vendorId || formData.recruitedId || formData.memberWithdrawalId));

    const payload = {
      tipo: formData.type,
      vendedorId: formData.vendorId,
      recrutadoId: formData.recruitedId,
      membroSaqueId: formData.memberWithdrawalId,
      vendedorNome: responsibleMember?.name || responsibleMember?.nome,
      cliente: formData.type === 'CORRIDINHA' ? 'EQUIPE AFL' : formData.type === 'SAQUE' ? 'FINANCEIRO AFL' : (formData.client || 'N/A'),
      item: formData.type === 'CORRIDINHA' ? 'BÔNUS: CORRIDINHA MALUCA' : formData.type === 'SAQUE' ? 'PAGAMENTO REALIZADO' : (formData.item || 'N/A'),
      valorNumerico: formData.type === 'CORRIDINHA' ? 0 : parsedTotalValue,
      recebidoNumerico: formData.type === 'CORRIDINHA' ? 0 : parsedReceivedValue,
      cashbackExtra: formData.type === 'CORRIDINHA' ? parsedTotalValue : 0,
      dataVencimento: formData.dueDate,
      criadoPor: displayUserName
    };

    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Falha ao postar registro.');
      }

      setFormData({
        type: 'VENDA',
        vendorId: canSelectAnySeller ? '' : String(loggedInMember?.discordId || ''),
        client: '',
        item: '',
        amount: '',
        receivedAmount: '',
        recruitedId: canSelectAnySeller ? '' : String(loggedInMember?.discordId || ''),
        dueDate: '',
        memberWithdrawalId: canSelectAnySeller ? '' : String(loggedInMember?.discordId || ''),
      });
      displayToast("REGISTRO POSTADO COM SUCESSO!");
      await forceDataSync();
    } catch (error: any) {
      displayToast(error?.message || 'Falha ao postar registro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovalDecision = async (id: string, action: 'APROVAR' | 'REPROVAR') => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/records/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: id, action: action, evaluatedBy: displayUserName })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Falha ao avaliar registro.');
      }
      await forceDataSync();
      displayToast(action === 'APROVAR' ? 'REGISTRO APROVADO!' : 'REGISTRO REPROVADO!');
    } catch (error: any) {
      displayToast(error?.message || 'Falha ao avaliar registro.');
    } finally {
      setIsLoading(false);
    }
  };

  const executeDeleteLog = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Falha ao excluir registro.');
      }
      await forceDataSync();
      setConfirmationModalData(null);
      displayToast('REGISTRO EXCLUÍDO!');
    } catch (error: any) {
      displayToast(error?.message || 'Falha ao excluir registro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLogRequest = (id: string) => {
    setConfirmationModalData({
      aberto: true,
      titulo: 'EXCLUIR REGISTRO',
      mensagem: 'Tem certeza que deseja deletar este log permanentemente?',
      tipo: 'perigo',
      acao: () => executeDeleteLog(id)
    });
  };

  const executeMonthRollover = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/rollover', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Falha ao executar virada.');
      }
      displayToast("MÊS FECHADO!");
      await forceDataSync();
      setConfirmationModalData(null);
    } catch (error: any) {
      displayToast(error?.message || 'Falha ao executar virada.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthRolloverRequest = () => {
    setConfirmationModalData({
      aberto: true,
      titulo: 'VIRADA DE MÊS',
      mensagem: 'ALERTA MÁXIMO: Isso irá arquivar o mês atual e zerar todos os contadores da equipe. Tem certeza que deseja prosseguir?',
      tipo: 'perigo',
      acao: executeMonthRollover
    });
  };

  const executeSystemRestore = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/audit');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Falha ao restaurar sistema.');
      }
      displayToast("SISTEMA RESTAURADO!");
      await forceDataSync();
      setConfirmationModalData(null);
    } catch (error: any) {
      displayToast(error?.message || 'Falha ao restaurar sistema.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSystemRestoreRequest = () => {
    setConfirmationModalData({
      aberto: true,
      titulo: 'RESTAURAR SISTEMA',
      mensagem: 'Tem certeza que deseja recalcular o banco de dados e voltar as vendas arquivadas para o Painel Principal?',
      tipo: 'aviso',
      acao: executeSystemRestore
    });
  };

  const handleInstallmentPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !installmentModalData) return;
    setIsLoading(true);

    const parsedPayment = parseFloat(installmentValue.replace(',', '.')) || 0;

    try {
      const response = await fetch('/api/records/installment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: installmentModalData.id, paidAmount: parsedPayment, nextDueDate: nextDueDate })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Falha ao registrar pagamento.');
      }
      setInstallmentModalData(null);
      setInstallmentValue('');
      await forceDataSync();
      displayToast('PAGAMENTO REGISTRADO!');
    } catch (error: any) {
      displayToast(error?.message || 'Falha ao registrar pagamento.');
    } finally {
      setIsLoading(false);
    }
  };

  const mobileNavigate = (tab: string, onNavigate?: () => void) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    onNavigate?.();
  };

  const navItems = [
    { id: 'inicio', label: 'Visão geral', icon: <LayoutDashboard size={18} /> },
    { id: 'ranking', label: 'Ranking', icon: <Trophy size={18} /> },
    { id: 'equipe', label: 'Efetivo', icon: <Users size={18} /> },
    { id: 'gestao', label: 'Mural', icon: <History size={18} />, onClick: () => setMuralPaginationLimit(20) },
    ...(canPostSales ? [{ id: 'registrar', label: 'Postar', icon: <PlusCircle size={18} /> }] : []),
    ...(isAdmin ? [{ id: 'pendencias', label: 'Pendências', icon: <Clock size={18} />, badge: pendingInstallments.length }] : []),
    ...(canApproveRecords ? [{ id: 'admin', label: 'Aprovações', icon: <ShieldCheck size={18} />, badge: pendingRecords.length }] : []),
    ...(isAdmin ? [
      { id: 'admin_zone', label: 'Administração', icon: <ShieldAlert size={18} />, onClick: () => setLogPaginationLimit(20) },
      { id: 'historico_backup', label: 'Histórico', icon: <Archive size={18} />, onClick: () => setHistoryPaginationLimit(20) },
    ] : []),
  ];

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body, * { scrollbar-width: thin !important; scrollbar-color: rgba(0,0,0,.18) transparent !important; }
            ::-webkit-scrollbar { width: 8px; height: 8px; background: transparent; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.18); border-radius: 999px; }
            ::-webkit-scrollbar-thumb:hover { background: #c89b0c; }
          `,
        }}
      />

      {toastMessage && (
        <div className="fixed left-1/2 top-5 z-[140] -translate-x-1/2 px-4 toast-enter">
          <div
            className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--ink)',
              borderColor: 'var(--line)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}
            >
              <CheckCircle2 size={18} />
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <div className="lg:hidden sticky top-0 z-40 border-b backdrop-blur">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'var(--line)' }}
        >
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border transition-colors hover:opacity-90"
            style={{ borderColor: 'var(--line)', background: 'var(--bg-elevated)' }}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl text-black">
              <UsersRound size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold">AFL Painel</p>
              <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>Gestão interna</p>
            </div>
          </div>
          <img src={displayUserAvatar} alt="" className="h-10 w-10 rounded-xl object-cover" />
        </div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
          <aside
            className="h-full w-[88vw] max-w-[320px] p-5"
            style={{ background: 'var(--sidebar)', color: 'var(--sidebar-ink)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent
              navItems={navItems}
              activeTab={activeTab}
              displayUserName={displayUserName}
              displayUserAvatar={displayUserAvatar}
              roleLabel={roleLabel}
              onNavigate={mobileNavigate}
            />
          </aside>
        </div>
      )}

      <div className="flex flex-1">
        <aside
          className="hidden lg:flex lg:w-72 lg:flex-col lg:justify-between lg:border-r lg:p-6"
          style={{ background: 'var(--sidebar)', color: 'var(--sidebar-ink)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <SidebarContent
            navItems={navItems}
            activeTab={activeTab}
            displayUserName={displayUserName}
            displayUserAvatar={displayUserAvatar}
            roleLabel={roleLabel}
            onNavigate={(tab, extra) => {
              setActiveTab(tab);
              extra?.();
            }}
          />
        </aside>

        <main className="flex flex-1 flex-col">
          <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between fade-up">
              <div>
                <p className="mb-2 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
                  AFL Painel
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {TAB_TITLES[activeTab] || 'Painel'}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="inline-flex items-center gap-3 rounded-2xl border px-3 py-3"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderColor: 'var(--line)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <img src={displayUserAvatar} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  <div>
                    <p className="text-sm font-semibold">{displayUserName}</p>
                    <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                      {roleLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  title="Sair"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition-colors hover:bg-black/[0.03]"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderColor: 'var(--line)',
                    color: 'var(--ink-soft)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </header>

            {isInitialLoad ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <>
                {activeTab === 'inicio' && (
                  <div className="space-y-6 fade-up">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <StatCard title="Valor bruto (mês)" value={globalStats.gross} icon={<TrendingUp size={24} />} type="money" />
                      <StatCard title="Valor líquido (caixa)" value={globalStats.net} icon={<Zap size={24} />} type="money" highlight />
                      <StatCard title="Membros ativos" value={activeTeam.length} icon={<Users size={24} />} />
                    </div>

                    <section
                      className="surface rounded-[var(--radius-md)] border p-5 sm:p-6"
                      style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}
                    >
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold">Desempenho da equipe</h2>
                          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Top 5 maiores vendedores do mês</p>
                        </div>
                        <Trophy size={24} style={{ color: 'var(--brand)' }} />
                      </div>
                      <div className="flex h-72 gap-3 overflow-x-auto pt-2">
                        {activeTeam.slice(0, 5).map((member: any) => {
                          const fillPercentage = member.grossSales > 0 ? (member.grossSales / maxGrossChart) * 100 : 0;
                          const adjustedHeight = member.grossSales > 0 ? Math.max(8, fillPercentage) : 0;
                          return (
                            <div key={member.discordId} className="flex h-full min-w-[110px] flex-1 flex-col items-center gap-2">
                              <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
                                R$ {formatCurrency(member.grossSales)}
                              </span>
                              <div
                                className="flex w-full max-w-[90px] flex-1 items-end overflow-hidden rounded-t-2xl border border-b-0"
                                style={{ background: 'var(--bg-muted)', borderColor: 'var(--line)' }}
                              >
                                <div
                                  className="w-full rounded-t-xl transition-all duration-700"
                                  style={{
                                    height: `${adjustedHeight}%`,
                                    background: 'linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%)',
                                  }}
                                />
                              </div>
                              <span className="w-full shrink-0 truncate text-center text-sm font-medium" title={member.name || member.nome}>
                                {member.name || member.nome || '—'}
                              </span>
                            </div>
                          );
                        })}
                        {activeTeam.length === 0 && (
                          <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'var(--ink-soft)' }}>
                            Sem dados suficientes
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'ranking' && (
                  <section className="surface overflow-hidden rounded-[var(--radius-md)] border fade-up" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead style={{ background: 'var(--bg-muted)', color: 'var(--ink-soft)' }}>
                          <tr>
                            <th className="px-5 py-4 text-sm font-semibold">Rank</th>
                            <th className="px-5 py-4 text-sm font-semibold">Agente</th>
                            <th className="px-5 py-4 text-right text-sm font-semibold">Produção (mês)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeTeam.map((member: any, index: number) => (
                            <tr key={member.discordId} className="border-t transition-colors hover:bg-black/[0.02]" style={{ borderColor: 'var(--line)' }}>
                              <td className="px-5 py-4 text-lg font-semibold" style={{ color: 'var(--ink-soft)' }}>{index + 1}º</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.nome || 'User')}&background=EAB308&color=000&bold=true`} className="h-10 w-10 rounded-xl object-cover" alt="" />
                                  <span className="font-medium">{member.name || member.nome}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right font-mono text-lg font-semibold" style={{ color: 'var(--brand-strong)' }}>
                                R$ {formatCurrency(member.grossSales)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {activeTab === 'equipe' && (
                  <div className="space-y-5 fade-up">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {['Todos', ...ROLES_HIERARCHY].map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSelectedRole(role)}
                          className="rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                          style={selectedRole === role ? {
                            background: 'var(--brand-soft)',
                            color: 'var(--brand-strong)',
                            borderColor: 'rgba(200,155,12,0.25)',
                          } : {
                            background: 'var(--bg-elevated)',
                            color: 'var(--ink-soft)',
                            borderColor: 'var(--line)',
                          }}
                        >
                          {role}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {filteredTeam.map((member: any) => (
                        <button
                          key={member.discordId}
                          type="button"
                          onClick={() => setSelectedMember(member)}
                          className="surface fade-up rounded-[var(--radius-md)] border p-5 text-left transition-transform hover:-translate-y-1"
                          style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}
                        >
                          <div className="mb-5 flex items-center gap-4">
                            <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.nome || 'User')}&background=EAB308&color=000&bold=true`} className="h-14 w-14 rounded-2xl object-cover" alt="" />
                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-semibold" title={member.name || member.nome}>{member.name || member.nome}</h3>
                              <p className="truncate text-sm" style={{ color: 'var(--brand-strong)' }}>{member.actualRole}</p>
                            </div>
                          </div>
                          <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
                            <MetricRow label="Bruto" value={`R$ ${formatCurrency(member.grossSales)}`} />
                            <MetricRow label="Líquido" value={`R$ ${formatCurrency(member.totalNet)}`} valueColor="var(--success)" />
                            <div
                              className="rounded-2xl px-4 py-3"
                              style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium">Saldo</span>
                                <span className="font-mono text-base font-semibold">R$ {formatCurrency(member.finalBalance)}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'gestao' && (
                  <div className="space-y-5 fade-up">
                    <SearchField
                      value={muralSearchQuery}
                      onChange={(value) => {
                        setMuralSearchQuery(value);
                        setMuralPaginationLimit(20);
                      }}
                      placeholder="Pesquisar cliente, agente ou item..."
                    />
                    <DataTableCard>
                      <table className="min-w-full text-left">
                        <thead style={{ background: 'var(--bg-muted)', color: 'var(--ink-soft)' }}>
                          <tr>
                            <th className="px-5 py-4 text-sm font-semibold">Membro</th>
                            <th className="px-5 py-4 text-sm font-semibold">Tipo</th>
                            <th className="px-5 py-4 text-sm font-semibold">Cliente / item</th>
                            <th className="px-5 py-4 text-right text-sm font-semibold">Valor</th>
                            <th className="px-5 py-4 text-right text-sm font-semibold">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMural.slice(0, muralPaginationLimit).map((record: any) => (
                            <tr key={record.id} className="border-t transition-colors hover:bg-black/[0.02]" style={{ borderColor: 'var(--line)' }}>
                              <td className="px-5 py-4 text-sm font-medium">{record.name || record.nome}</td>
                              <td className="px-5 py-4">
                                <TypeBadge type={record.type || record.tipo || 'VENDA'} />
                              </td>
                              <td className="px-5 py-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
                                <TooltipText text={`${getDisplayClientName(record)} | ${getDisplayItemName(record)}`} maxWidth="260px" />
                              </td>
                              <td className="px-5 py-4 text-right font-mono text-sm font-semibold" style={{ color: record.type === 'SAQUE' || record.tipo === 'SAQUE' ? 'var(--danger)' : 'var(--success)' }}>
                                {record.type === 'SAQUE' || record.tipo === 'SAQUE' ? '-' : '+'} R$ {formatCurrency(getGrossValue(record) || getNetValue(record) || getBonusValue(record))}
                              </td>
                              <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--ink-soft)' }}>
                                {new Date(record.createdAt || record.criado_em).toLocaleDateString('pt-BR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <LoadMoreFooter
                        currentLength={filteredMural.length}
                        limit={muralPaginationLimit}
                        onClick={() => setMuralPaginationLimit(prev => prev + 20)}
                        emptyText="Nenhum resultado encontrado."
                      />
                    </DataTableCard>
                  </div>
                )}

                {activeTab === 'registrar' && canPostSales && (
                  <div className="mx-auto max-w-3xl space-y-5 fade-up">
                    <div className="surface rounded-[var(--radius-md)] border p-2" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                          { id: 'VENDA', label: 'Venda', icon: <ShoppingCart size={16} /> },
                          ...(canPostExtras ? [{ id: 'CORRIDINHA', label: 'Bônus', icon: <Zap size={16} /> }, { id: 'SAQUE', label: 'Pagamento', icon: <Banknote size={16} /> }] : [])
                        ].map(typeConfig => (
                          <button
                            key={typeConfig.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: typeConfig.id })}
                            className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
                            style={formData.type === typeConfig.id ? {
                              background: 'var(--brand-soft)',
                              color: 'var(--brand-strong)',
                            } : {
                              background: 'transparent',
                              color: 'var(--ink-soft)',
                            }}
                          >
                            {typeConfig.icon}
                            {typeConfig.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleFormSubmit} className="surface rounded-[var(--radius-md)] border p-6 sm:p-8" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">Agente responsável</label>
                          <select
                            value={formData.vendorId || formData.recruitedId || formData.memberWithdrawalId}
                            onChange={e => setFormData({ ...formData, vendorId: e.target.value, recruitedId: e.target.value, memberWithdrawalId: e.target.value })}
                            disabled={!canSelectAnySeller}
                            className="w-full rounded-2xl border px-4 py-3 outline-none transition-colors"
                            style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--ink)' }}
                            required
                          >
                            <option value="">Selecione na equipe...</option>
                            {activeTeam.map((member: any) => <option key={member.discordId} value={member.discordId}>{member.name || member.nome} ({member.actualRole})</option>)}
                          </select>
                          {!canSelectAnySeller && (
                            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                              Sua venda será postada no seu próprio nome e ficará pendente para aprovação do Master.
                            </p>
                          )}
                        </div>

                        {formData.type === 'VENDA' && (
                          <div className="space-y-5 fade-up">
                            <InputField label="Cliente (nome / ID)" value={formData.client} onChange={(val: string) => setFormData({ ...formData, client: val })} placeholder="Ex: Lucas | 4116" />
                            <InputField label="Item comprado" value={formData.item} onChange={(val: string) => setFormData({ ...formData, item: val })} placeholder="Ex: Farm de Dinheiro" />
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                              <InputField label="Valor total (R$)" type="number" value={formData.amount} onChange={(val: string) => setFormData({ ...formData, amount: val })} placeholder="0,00" />
                              <InputField label="Valor recebido (R$)" type="number" value={formData.receivedAmount} onChange={(val: string) => setFormData({ ...formData, receivedAmount: val })} placeholder="0,00" />
                            </div>
                            {requireDueDate && (
                              <div className="fade-up">
                                <InputField label="Data vencimento (pendência)" type="date" value={formData.dueDate} onChange={(val: string) => setFormData({ ...formData, dueDate: val })} required={true} />
                              </div>
                            )}
                          </div>
                        )}

                        {formData.type === 'CORRIDINHA' && (
                          <div className="fade-up">
                            <InputField label="Valor do bônus (R$)" type="number" value={formData.amount} onChange={(val: string) => setFormData({ ...formData, amount: val })} placeholder="Ex: 50,00" />
                          </div>
                        )}

                        {formData.type === 'SAQUE' && (
                          <div className="fade-up">
                            <InputField label="Cashback pago ao agente (R$)" type="number" value={formData.amount} onChange={(val: string) => setFormData({ ...formData, amount: val })} placeholder="Ex: 150,00" />
                          </div>
                        )}

                        <button
                          disabled={isLoading}
                          className="w-full rounded-2xl px-5 py-4 text-sm font-semibold transition-all"
                          style={{
                            background: 'var(--brand)',
                            color: '#221a00',
                            opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          {isLoading ? 'PROCESSANDO...' : 'Enviar registro'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'pendencias' && isAdmin && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 fade-up">
                    {pendingInstallments.length === 0 && (
                      <EmptyState text="Nenhuma cobrança ativa" />
                    )}
                    {pendingInstallments.map((record: any) => (
                      <div key={record.id} className="surface rounded-[var(--radius-md)] border p-5" style={{ borderColor: 'rgba(220,38,38,0.18)', boxShadow: 'var(--shadow-md)' }}>
                        <div className="mb-5 flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--line)' }}>
                          <div>
                            <h3 className="text-lg font-semibold">{getDisplayClientName(record)}</h3>
                            <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{record.name || record.nome}</p>
                          </div>
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                            Falta R$ {formatCurrency(getGrossValue(record) - getNetValue(record))}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
                          <div>
                            <span className="font-medium" style={{ color: 'var(--ink)' }}>Produto: </span>
                            <TooltipText text={getDisplayItemName(record)} maxWidth="100%" />
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: 'var(--ink)' }}>Vencimento: </span>
                            {record.dueDate?.split('-').reverse().join('/') || record.dataVencimento?.split('-').reverse().join('/') || 'A COMBINAR'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInstallmentModalData(record)}
                          className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-colors"
                          style={{ background: 'var(--success)', color: '#052814' }}
                        >
                          Receber pagamento
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'admin' && canApproveRecords && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 fade-up">
                    {pendingRecords.length === 0 && (
                      <EmptyState text="Fila limpa" />
                    )}
                    {pendingRecords.map((record: any) => (
                      <div key={record.id} className="surface rounded-[var(--radius-md)] border p-5" style={{ borderColor: 'rgba(200,155,12,0.2)', boxShadow: 'var(--shadow-md)' }}>
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold">{record.name || record.nome}</h3>
                          <div className="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}>
                            {record.type || record.tipo} • R$ {formatCurrency(getGrossValue(record) || getNetValue(record) || getBonusValue(record) || getPaidValue(record))}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
                          <div>
                            <span className="font-medium" style={{ color: 'var(--ink)' }}>Cliente: </span>
                            <TooltipText text={getDisplayClientName(record)} maxWidth="100%" />
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: 'var(--ink)' }}>Item: </span>
                            <TooltipText text={getDisplayItemName(record)} maxWidth="100%" />
                          </div>
                          {record.createdBy && (
                            <div className="border-t pt-3" style={{ borderColor: 'var(--line)' }}>
                              Postado por: <span style={{ color: 'var(--ink)' }}>{record.createdBy || record.criadoPor}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-5 flex gap-3">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleApprovalDecision(record.id, 'APROVAR')}
                            className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold"
                            style={{ background: 'var(--brand)', color: '#221a00', opacity: isLoading ? 0.6 : 1 }}
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleApprovalDecision(record.id, 'REPROVAR')}
                            className="rounded-2xl border px-4 py-3 transition-colors"
                            style={{ borderColor: 'rgba(220,38,38,0.2)', color: 'var(--danger)', opacity: isLoading ? 0.6 : 1 }}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'admin_zone' && isAdmin && (
                  <div className="space-y-6 fade-up">
                    <div className="surface rounded-[var(--radius-md)] border p-5 sm:p-6" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h2 className="text-xl font-semibold">Central administrativa</h2>
                          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                            Operações sensíveis do mês, restauração e auditoria dos registros.
                          </p>
                        </div>
                        <div className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--ink-soft)' }}>
                          Acesso restrito
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <section className="surface relative overflow-hidden rounded-[var(--radius-md)] border p-6" style={{ borderColor: 'rgba(220,38,38,0.16)', boxShadow: 'var(--shadow-md)' }}>
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full" style={{ background: 'rgba(220,38,38,0.06)' }} />
                        <div className="relative">
                          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                            <Archive size={20} />
                          </div>
                          <h3 className="text-lg font-semibold">Virada de mês</h3>
                          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-soft)' }}>
                            Arquiva as vendas do período atual e zera os contadores da equipe. Use somente no dia 1º.
                          </p>
                          <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
                            <li>• Registros aprovados passam para histórico</li>
                            <li>• Contadores de produção são zerados</li>
                            <li>• Ação irreversível sem restauração</li>
                          </ul>
                          <button
                            type="button"
                            onClick={handleMonthRolloverRequest}
                            disabled={isLoading}
                            className="mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold"
                            style={{ background: 'var(--danger)', color: 'white', opacity: isLoading ? 0.6 : 1 }}
                          >
                            Executar virada
                          </button>
                        </div>
                      </section>

                      <section className="surface relative overflow-hidden rounded-[var(--radius-md)] border p-6" style={{ borderColor: 'rgba(200,155,12,0.22)', boxShadow: 'var(--shadow-md)' }}>
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full" style={{ background: 'rgba(200,155,12,0.08)' }} />
                        <div className="relative">
                          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                            <Database size={20} />
                          </div>
                          <h3 className="text-lg font-semibold">Restaurar sistema</h3>
                          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-soft)' }}>
                            Desfaz uma virada precoce e devolve vendas arquivadas para o painel principal.
                          </p>
                          <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
                            <li>• Restaura status ARQUIVADO → APROVADO</li>
                            <li>• Útil para correção imediata</li>
                            <li>• Não apaga registros</li>
                          </ul>
                          <button
                            type="button"
                            onClick={handleSystemRestoreRequest}
                            disabled={isLoading}
                            className="mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold"
                            style={{ background: 'var(--brand)', color: '#221a00', opacity: isLoading ? 0.6 : 1 }}
                          >
                            Restaurar vendas
                          </button>
                        </div>
                      </section>
                    </div>

                    <section className="surface overflow-hidden rounded-[var(--radius-md)] border" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
                      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--line)', background: 'linear-gradient(180deg, rgba(200,155,12,0.05), transparent)' }}>
                        <div>
                          <h2 className="text-lg font-semibold">Auditoria de logs</h2>
                          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                            {filteredLogs.length} registro{filteredLogs.length === 1 ? '' : 's'} aprovado{filteredLogs.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="w-full sm:w-80">
                          <SearchField
                            value={logSearchQuery}
                            onChange={(value) => {
                              setLogSearchQuery(value);
                              setLogPaginationLimit(20);
                            }}
                            placeholder="Buscar por membro, item ou tipo..."
                          />
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                          <thead style={{ background: 'var(--bg-muted)', color: 'var(--ink-soft)' }}>
                            <tr>
                              <th className="px-5 py-4 text-sm font-semibold">Membro</th>
                              <th className="px-5 py-4 text-sm font-semibold">Tipo / valor</th>
                              <th className="px-5 py-4 text-sm font-semibold">Autoria</th>
                              <th className="px-5 py-4 text-right text-sm font-semibold">Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLogs.slice(0, logPaginationLimit).map((record: any) => (
                              <tr key={record.id} className="border-t transition-colors hover:bg-black/[0.02]" style={{ borderColor: 'var(--line)' }}>
                                <td className="px-5 py-4 text-sm font-medium">{record.name || record.nome}</td>
                                <td className="px-5 py-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <TypeBadge type={record.type || record.tipo || 'VENDA'} />
                                    <span className="font-mono text-sm font-semibold">
                                      R$ {formatCurrency(getGrossValue(record) || getNetValue(record) || getBonusValue(record) || getPaidValue(record))}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
                                  <div className="space-y-1">
                                    <div><span style={{ color: 'var(--ink)' }}>Postou:</span> {record.createdBy || record.criadoPor || 'Sistema'}</div>
                                    <div><span style={{ color: 'var(--ink)' }}>Aprovou:</span> {record.evaluatedBy || record.avaliadoPor || 'N/A'}</div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLogRequest(record.id)}
                                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
                                    style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                                  >
                                    <Trash2 size={14} />
                                    Excluir
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <LoadMoreFooter
                        currentLength={filteredLogs.length}
                        limit={logPaginationLimit}
                        onClick={() => setLogPaginationLimit(prev => prev + 20)}
                        emptyText="Nenhum log encontrado."
                      />
                    </section>
                  </div>
                )}

                {activeTab === 'historico_backup' && isAdmin && (
                  <div className="space-y-6 fade-up">
                    <div className="surface rounded-[var(--radius-md)] border p-5 sm:p-6" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <h2 className="text-xl font-semibold">Histórico mensal</h2>
                          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                            Consulte produção e registros por período fechado ou aberto.
                          </p>
                        </div>
                        <div className="w-full max-w-sm">
                          <label className="mb-2 block text-sm font-medium">Período</label>
                          <select
                            value={backupMonth}
                            onChange={(e) => setBackupMonth(e.target.value)}
                            className="w-full rounded-2xl border px-4 py-3 outline-none"
                            style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--ink)' }}
                          >
                            <option value="">Selecione o mês...</option>
                            {availableMonths.map((monthOption: any) => (
                              <option key={monthOption} value={monthOption}>{formatMonthName(monthOption)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <StatMiniCard label="Bruto do período" value={`R$ ${formatCurrency(backupStats.gross)}`} />
                      <StatMiniCard label="Caixa do período" value={`R$ ${formatCurrency(backupStats.net)}`} highlight />
                      <StatMiniCard label="Registros listados" value={`${filteredHistory.length}`} />
                    </div>

                    <section className="surface overflow-hidden rounded-[var(--radius-md)] border" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
                      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--line)' }}>
                        <div>
                          <h3 className="text-lg font-semibold">
                            {backupMonth ? formatMonthName(backupMonth) : 'Selecione um período'}
                          </h3>
                          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                            Movimentações do mês selecionado
                          </p>
                        </div>
                        <div className="w-full sm:w-96">
                          <SearchField
                            value={historySearchQuery}
                            onChange={(value) => {
                              setHistorySearchQuery(value);
                              setHistoryPaginationLimit(20);
                            }}
                            placeholder="Pesquisar no histórico..."
                          />
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                          <thead style={{ background: 'var(--bg-muted)', color: 'var(--ink-soft)' }}>
                            <tr>
                              <th className="px-5 py-4 text-sm font-semibold">Agente</th>
                              <th className="px-5 py-4 text-sm font-semibold">Tipo</th>
                              <th className="px-5 py-4 text-sm font-semibold">Valor</th>
                              <th className="px-5 py-4 text-right text-sm font-semibold">Dia</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredHistory.slice(0, historyPaginationLimit).map((record: any) => (
                              <tr key={record.id} className="border-t transition-colors hover:bg-black/[0.02]" style={{ borderColor: 'var(--line)' }}>
                                <td className="px-5 py-4 text-sm font-medium">{record.name || record.nome}</td>
                                <td className="px-5 py-4">
                                  <TypeBadge type={record.type || record.tipo || 'VENDA'} />
                                </td>
                                <td className="px-5 py-4 font-mono text-sm font-semibold" style={{ color: record.type === 'SAQUE' || record.tipo === 'SAQUE' ? 'var(--danger)' : 'var(--success)' }}>
                                  {record.type === 'SAQUE' || record.tipo === 'SAQUE' ? '-' : '+'} R$ {formatCurrency(getGrossValue(record) || getNetValue(record) || getBonusValue(record) || getPaidValue(record))}
                                </td>
                                <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--ink-soft)' }}>
                                  {new Date(record.createdAt || record.criado_em).toLocaleDateString('pt-BR')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <LoadMoreFooter
                        currentLength={filteredHistory.length}
                        limit={historyPaginationLimit}
                        onClick={() => setHistoryPaginationLimit(prev => prev + 20)}
                        emptyText={backupMonth ? 'Nenhum registro encontrado neste período.' : 'Selecione um mês para ver o histórico.'}
                      />
                    </section>
                  </div>
                )}
              </>
            )}

          </div>
          <SiteFooter />
        </main>
      </div>

      {selectedMember && activeModalMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface fade-up flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
            <div className="border-b p-6 sm:p-8" style={{ borderColor: 'var(--line)', background: 'linear-gradient(180deg, rgba(200,155,12,0.08), transparent)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                  <img src={activeModalMember.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeModalMember.name || activeModalMember.nome || 'User')}&background=EAB308&color=000&bold=true`} className="h-20 w-20 rounded-[24px] object-cover sm:h-24 sm:w-24" alt="" />
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-semibold sm:text-3xl" title={activeModalMember.name || activeModalMember.nome}>
                      {activeModalMember.name || activeModalMember.nome}
                    </h2>
                    <p className="mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}>
                      {activeModalMember.actualRole}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="rounded-xl border p-2"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 sm:p-8 lg:grid-cols-2">
              <div className="space-y-4">
                <section className="rounded-[24px] p-6" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                  <p className="text-sm font-medium">Saldo a receber</p>
                  <p className="mt-2 truncate font-mono text-4xl font-semibold sm:text-5xl">
                    R$ {formatCurrency(activeModalMember.finalBalance)}
                  </p>
                </section>
                <div className="grid grid-cols-2 gap-4">
                  <MiniInfoCard title="Bônus extras" value={`+R$ ${formatCurrency(activeModalMember.bonusEarned)}`} tone="info" icon={<Zap size={18} />} />
                  <MiniInfoCard title="Valor pago" value={`-R$ ${formatCurrency(activeModalMember.amountPaid)}`} tone="danger" icon={<Banknote size={18} />} />
                  <MiniInfoCard title="Bruto (mês)" value={`R$ ${formatCurrency(activeModalMember.grossSales)}`} tone="neutral" icon={<TrendingUp size={18} />} />
                  <MiniInfoCard title="Caixa (mês)" value={`R$ ${formatCurrency(activeModalMember.totalNet)}`} tone="neutral" icon={<Database size={18} />} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <History size={18} style={{ color: 'var(--brand-strong)' }} />
                  <h3 className="text-lg font-semibold">Extrato recente</h3>
                </div>
                <div className="space-y-3">
                  {records.filter((r:any) => String(r.discordId) === String(activeModalMember.discordId) && (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && (r.createdAt || r.criado_em)?.startsWith(currentMonthString)).map((r: any) => (
                    <div key={r.id} className="surface-muted flex items-center gap-4 rounded-2xl border p-4" style={{ borderColor: 'var(--line)' }}>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold" style={{ color: r.type === 'CORRIDINHA' || r.tipo === 'CORRIDINHA' ? 'var(--info)' : r.type === 'SAQUE' || r.tipo === 'SAQUE' ? 'var(--danger)' : 'var(--ink)' }}>
                          <TooltipText text={getDisplayItemName(r)} maxWidth="240px" />
                        </div>
                        <p className="mt-1 truncate text-sm" style={{ color: 'var(--ink-soft)' }}>
                          {new Date(r.createdAt || r.criado_em).toLocaleDateString('pt-BR')} • {getDisplayClientName(r)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-base font-semibold" style={{ color: r.type === 'SAQUE' || r.tipo === 'SAQUE' ? 'var(--danger)' : 'var(--success)' }}>
                          {r.type === 'SAQUE' || r.tipo === 'SAQUE' ? '-' : '+'} R$ {formatCurrency(getGrossValue(r) || getNetValue(r) || getBonusValue(r) || getPaidValue(r))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {installmentModalData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface fade-up relative w-full max-w-xl rounded-[28px] border p-6 sm:p-8" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
            <button
              type="button"
              onClick={() => setInstallmentModalData(null)}
              className="absolute right-5 top-5 rounded-xl border p-2"
              style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
            >
              <X size={20} />
            </button>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold">Receber pagamento</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                Registre o recebimento e, se necessário, um novo vencimento.
              </p>
            </div>
            <form onSubmit={handleInstallmentPayment} className="space-y-5">
              <div className="surface-muted rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--line)' }}>
                <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Devedor</p>
                <p className="mt-1 text-xl font-semibold">{getDisplayClientName(installmentModalData)}</p>
              </div>
              <InputField
                label={`Recebido agora (falta R$ ${formatCurrency(getGrossValue(installmentModalData) - getNetValue(installmentModalData))})`}
                type="number"
                value={installmentValue}
                onChange={setInstallmentValue}
                placeholder="R$ 0,00"
              />
              {parseFloat(installmentValue || '0') < (getGrossValue(installmentModalData) - getNetValue(installmentModalData)) && installmentValue !== '' && (
                <div className="rounded-2xl border p-4 fade-up" style={{ borderColor: 'rgba(220,38,38,0.15)', background: 'var(--danger-soft)' }}>
                  <InputField label="Novo vencimento" type="date" value={nextDueDate} onChange={setNextDueDate} />
                </div>
              )}
              <button
                disabled={isLoading}
                className="w-full rounded-2xl px-5 py-4 text-sm font-semibold"
                style={{ background: 'var(--success)', color: '#052814', opacity: isLoading ? 0.6 : 1 }}
              >
                {isLoading ? 'SINCRONIZANDO...' : 'Confirmar recebimento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {confirmationModalData && confirmationModalData.aberto && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface fade-up w-full max-w-md rounded-[28px] border p-6 text-center" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: confirmationModalData.tipo === 'perigo' ? 'var(--danger-soft)' : 'var(--warning-soft)',
                color: confirmationModalData.tipo === 'perigo' ? 'var(--danger)' : 'var(--warning)',
              }}
            >
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-semibold">{confirmationModalData.titulo}</h3>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--ink-soft)' }}>
              {confirmationModalData.mensagem}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmationModalData(null)}
                disabled={isLoading}
                className="rounded-2xl border px-4 py-3 text-sm font-semibold"
                style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmationModalData.acao}
                disabled={isLoading}
                className="rounded-2xl px-4 py-3 text-sm font-semibold"
                style={{
                  background: confirmationModalData.tipo === 'perigo' ? 'var(--danger)' : 'var(--warning)',
                  color: confirmationModalData.tipo === 'perigo' ? '#fff' : '#3b2a00',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? 'AGUARDE...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  navItems,
  activeTab,
  displayUserName,
  displayUserAvatar,
  roleLabel,
  onNavigate,
}: {
  navItems: Array<{ id: string; label: string; icon: React.ReactNode; badge?: number; onClick?: () => void }>;
  activeTab: string;
  displayUserName: string;
  displayUserAvatar: string;
  roleLabel: string;
  onNavigate: (tab: string, extra?: () => void) => void;
}) {
  return (
    <>
      <div>
        <div className="mb-8 flex items-center gap-3">
          <div className="brand-mark flex h-12 w-12 items-center justify-center rounded-2xl text-black">
            <UsersRound size={20} />
          </div>
          <div>
            <p className="text-base font-semibold">AFL Painel</p>
            <p className="text-sm" style={{ color: 'var(--sidebar-muted)' }}>Gestão da equipe</p>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <img src={displayUserAvatar} alt="" className="h-11 w-11 rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayUserName}</p>
            <p className="text-xs" style={{ color: 'var(--sidebar-muted)' }}>{roleLabel}</p>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              badge={item.badge}
              onClick={() => onNavigate(item.id, item.onClick)}
            />
          ))}
        </nav>
      </div>

      <button
        type="button"
        onClick={() => signOut()}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10"
      >
        <LogOut size={16} />
        Desconectar
      </button>
    </>
  );
}

function SkeletonCard() {
  return (
    <div className="surface animate-pulse rounded-[var(--radius-md)] border p-6" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
      <div className="mb-4 h-4 w-24 rounded-full" style={{ background: 'var(--bg-muted)' }} />
      <div className="h-10 w-40 rounded-full" style={{ background: 'var(--bg-muted)' }} />
    </div>
  );
}

function MetricRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span style={{ color: 'var(--ink-soft)' }}>{label}</span>
      <span className="font-mono font-semibold" style={{ color: valueColor || 'var(--ink)' }}>{value}</span>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  type?: 'number' | 'money';
  highlight?: boolean;
}

function StatCard({ title, value, icon, type = "number", highlight = false }: StatCardProps) {
  const displayValue = type === 'money' ? `R$ ${formatCurrency(value)}` : value;
  return (
    <div
      className="surface rounded-[var(--radius-md)] border p-6"
      style={{
        borderColor: highlight ? 'rgba(200,155,12,0.24)' : 'var(--line)',
        boxShadow: 'var(--shadow-md)',
        background: highlight ? 'linear-gradient(180deg, rgba(200,155,12,0.10), var(--bg-elevated))' : 'var(--bg-elevated)',
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm font-medium" style={{ color: highlight ? 'var(--brand-strong)' : 'var(--ink-soft)' }}>{title}</p>
        <div style={{ color: highlight ? 'var(--brand-strong)' : 'var(--ink-faint)' }}>{icon}</div>
      </div>
      <h3 className="truncate text-3xl font-semibold sm:text-4xl" style={{ color: highlight ? 'var(--brand-strong)' : 'var(--ink)' }}>
        {displayValue}
      </h3>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ icon, label, active, onClick, badge }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors"
      style={active ? {
        background: 'rgba(200,155,12,0.16)',
        color: 'var(--sidebar-ink)',
      } : {
        background: 'transparent',
        color: 'var(--sidebar-muted)',
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color: active ? '#f2d062' : 'var(--sidebar-muted)' }}>{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge ? (
        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: '#fff', color: '#111' }}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

function InputField({ label, value, onChange, placeholder, type = "text", required = true }: InputFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-2xl border px-4 py-3 outline-none transition-colors"
        style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--ink)' }}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--ink-soft)' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border py-3 pl-11 pr-4 outline-none transition-colors"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--line)', color: 'var(--ink)' }}
      />
    </div>
  );
}

function DataTableCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="surface overflow-hidden rounded-[var(--radius-md)] border" style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow-md)' }}>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function LoadMoreFooter({
  currentLength,
  limit,
  onClick,
  emptyText,
}: {
  currentLength: number;
  limit: number;
  onClick: () => void;
  emptyText: string;
}) {
  if (currentLength === 0) {
    return <div className="p-8 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{emptyText}</div>;
  }
  if (currentLength <= limit) return null;
  return (
    <div className="border-t p-4 text-center" style={{ borderColor: 'var(--line)' }}>
      <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium" style={{ borderColor: 'var(--line)' }}>
        Carregar mais <ChevronDown size={16} />
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-[var(--radius-md)] border border-dashed p-12 text-center text-sm" style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}>
      {text}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const normalizedType = type?.toUpperCase();
  const tone = normalizedType === 'SAQUE'
    ? { background: 'var(--danger-soft)', color: 'var(--danger)' }
    : normalizedType === 'CORRIDINHA'
      ? { background: 'var(--info-soft)', color: 'var(--info)' }
      : { background: 'var(--brand-soft)', color: 'var(--brand-strong)' };

  return (
    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={tone}>
      {type}
    </span>
  );
}

function StatMiniCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="surface rounded-[var(--radius-md)] border p-5"
      style={{
        borderColor: highlight ? 'rgba(34,197,94,0.18)' : 'var(--line)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p className="text-sm font-medium" style={{ color: highlight ? 'var(--success)' : 'var(--ink-soft)' }}>{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold" style={{ color: highlight ? 'var(--success)' : 'var(--ink)' }}>{value}</p>
    </div>
  );
}

function MiniInfoCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string;
  value: string;
  tone: 'info' | 'danger' | 'neutral';
  icon: React.ReactNode;
}) {
  const toneMap = {
    info: { background: 'var(--info-soft)', color: 'var(--info)' },
    danger: { background: 'var(--danger-soft)', color: 'var(--danger)' },
    neutral: { background: 'var(--bg-muted)', color: 'var(--ink)' },
  }[tone];

  return (
    <div className="rounded-2xl p-4" style={toneMap}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <span>{icon}</span>
      </div>
      <p className="truncate font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}