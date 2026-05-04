// Configuração do Supabase — compartilhada entre usuario.js e admin.js
// Este arquivo deve ser carregado APÓS o SDK do Supabase e ANTES dos outros scripts

const SUPABASE_URL = 'https://dtkwhcxmwfgfuwmaqzbl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0a3doY3htd2ZnZnV3bWFxemJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NjMxNzcsImV4cCI6MjA5MzQzOTE3N30.J5mjw5A-baeILbFUSABYLaMosO0DInKTZwK6uhWDR6Q';

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
