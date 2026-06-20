// src/hooks/useLeads.ts
// Substitui todos os dados mock por chamadas reais ao Supabase
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Lead, Message } from "@/mockLeads";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();

    // Escuta mudanças em tempo real na tabela leads
    const channel = supabase
      .channel("leads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchLeads() {
    try {
      setLoading(true);

      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;

      // Busca mensagens de todos os leads
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Junta mensagens com seus leads
      const leadsWithMessages: Lead[] = (leadsData ?? []).map((lead) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        property: lead.property,
        status: lead.status,
        budget: lead.budget,
        bedrooms: lead.bedrooms,
        region: lead.region,
        intent: lead.intent,
        score: lead.score,
        lastMessage: lead.last_message,
        lastActivity: lead.last_activity,
        unread: lead.unread,
        responseTime: lead.response_time,
        messages: (messagesData ?? [])
          .filter((m) => m.lead_id === lead.id)
          .map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            time: m.time,
          })),
      }));

      setLeads(leadsWithMessages);
    } catch (err) {
      console.error("Erro ao buscar leads:", err);
      setError("Não foi possível carregar os leads.");
    } finally {
      setLoading(false);
    }
  }

  async function addLead(lead: Omit<Lead, "messages">) {
    const { error } = await supabase.from("leads").insert({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      source: lead.source,
      property: lead.property,
      status: lead.status,
      budget: lead.budget,
      bedrooms: lead.bedrooms,
      region: lead.region,
      intent: lead.intent,
      score: lead.score,
      last_message: lead.lastMessage,
      last_activity: lead.lastActivity,
      unread: lead.unread,
      response_time: lead.responseTime,
    });
    if (error) throw error;
    await fetchLeads();
  }

  async function updateLeadStatus(id: string, status: Lead["status"]) {
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
    await fetchLeads();
  }

  async function sendMessage(leadId: string, message: Omit<Message, "id">) {
    const newId = `m_${Date.now()}`;
    const { error } = await supabase.from("messages").insert({
      id: newId,
      lead_id: leadId,
      sender: message.sender,
      text: message.text,
      time: message.time,
    });
    if (error) throw error;

    // Atualiza last_message do lead
    await supabase
      .from("leads")
      .update({ last_message: message.text, last_activity: "agora", unread: 0 })
      .eq("id", leadId);

    await fetchLeads();
  }

  async function markAsRead(leadId: string) {
    await supabase
      .from("leads")
      .update({ unread: 0 })
      .eq("id", leadId);
    await fetchLeads();
  }

  return {
    leads,
    loading,
    error,
    addLead,
    updateLeadStatus,
    sendMessage,
    markAsRead,
    refresh: fetchLeads,
  };
}
