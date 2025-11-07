import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Inscrito, Nota } from "@/lib/cosplay-types";
import { clampNota } from "@/lib/cosplay-utils";

export function useCosplayData() {
  const [inscritos, setInscritos] = useState<Inscrito[]>([]);
  const [notas, setNotas] = useState<Record<string, Nota>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carregar inscritos
  useEffect(() => {
    loadInscritos();
    loadNotas();

    // Realtime subscription
    const inscritosChannel = supabase
      .channel('inscritos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inscritos'
        },
        () => {
          loadInscritos();
        }
      )
      .subscribe();

    const notasChannel = supabase
      .channel('notas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notas'
        },
        () => {
          loadNotas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inscritosChannel);
      supabase.removeChannel(notasChannel);
    };
  }, []);

  async function loadInscritos() {
    try {
      const { data, error } = await supabase
        .from('inscritos')
        .select('*')
        .order('created', { ascending: true });

      if (error) throw error;
      setInscritos(data || []);
    } catch (error) {
      console.error('Erro ao carregar inscritos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os participantes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadNotas() {
    try {
      const { data, error } = await supabase
        .from('notas')
        .select('*');

      if (error) throw error;
      
      const notasMap: Record<string, Nota> = {};
      (data || []).forEach(nota => {
        notasMap[nota.id] = nota;
      });
      setNotas(notasMap);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    }
  }

  async function addInscrito(inscrito: Omit<Inscrito, 'id' | 'created' | 'created_at'>) {
    try {
      const { error } = await supabase
        .from('inscritos')
        .insert({
          nome: inscrito.nome,
          categoria: inscrito.categoria,
          cosplay: inscrito.cosplay,
          created: Date.now()
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Participante ${inscrito.nome} adicionado com sucesso!`
      });
    } catch (error) {
      console.error('Erro ao adicionar inscrito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o participante",
        variant: "destructive"
      });
      throw error;
    }
  }

  async function deleteInscrito(id: string) {
    try {
      const { error } = await supabase
        .from('inscritos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Participante removido com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao deletar inscrito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o participante",
        variant: "destructive"
      });
      throw error;
    }
  }

  async function setNota(id: string, jurorIndex: number, value: string | number | null) {
    try {
      const clamped = clampNota(value);
      const jurorField = `jurado_${jurorIndex + 1}` as keyof Nota;

      const { error } = await supabase
        .from('notas')
        .upsert({
          id,
          [jurorField]: clamped
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a avaliação",
        variant: "destructive"
      });
      throw error;
    }
  }

  return {
    inscritos,
    notas,
    loading,
    addInscrito,
    deleteInscrito,
    setNota,
    refresh: () => {
      loadInscritos();
      loadNotas();
    }
  };
}
