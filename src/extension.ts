import * as ableton from "@ableton-extensions/sdk";

export function activate(activation: ableton.ActivationContext) {
  // Inicializa a API
  const api = ableton.initialize(activation, "1.0.0");
  
  // 1. Defina um ID fixo para evitar erros de digitação (Este é o "nome interno" do comando)
  const COMMAND_ID = "com.revocal.reversereverb";

  // 2. REGISTRA O COMANDO (A Lógica)
  api.commands.registerCommand(COMMAND_ID, async (context: any) => {
    console.log("Tipo do objeto clicado:", context?.target?.type);
    // Verificação para garantir que o usuário clicou em um clipe de áudio
    if (!context.target) {
      console.warn("Por favor, selecione um clipe de audio.");
      return;
    }
    
    // Executa a sua lógica de processamento
    try {
        await generateReverseReverbSwell(api, context.target);
    } catch (error) {
        console.error("Erro ao gerar o efeito de Reverse Reverb: ", error);
    }
  });

  // 3. REGISTRA A AÇÃO NO MENU DE CONTEXTO (A Interface)
  api.ui.registerContextMenuAction(
    "AudioClip",                    // Escopo onde o menu vai aparecer
    "Gerar Reverse Reverb",  // Nome que aparece para o usuário no Ableton
    COMMAND_ID                 // ID (Exatamente o mesmo que registramos acima!)
  );
}

/**
 * Função responsável por orquestrar a lógica assíncrona do Reverse Reverb.
 */
async function generateReverseReverbSwell(api: any, originalClip: any) {
  const song = api.song;
  const originalTrack = originalClip.track;
  
  console.log(`Iniciando processamento para o clipe: ${originalClip.name}`);

  // 1. Criamos uma trilha logo abaixo da original para armazenar o efeito (Swell)
  const swellTrack = await song.createAudioTrack(originalTrack.index + 1);
  swellTrack.name = `${originalClip.name} - RevRev`;

  // 2. Copiamos o clipe original para a nova trilha
  const clipStartTime = originalClip.startTime;
  const copiedClip = await originalClip.duplicate(swellTrack, clipStartTime);

  // 3. Invertemos o Áudio (Reverse)
  api.selection.select(copiedClip);
  await api.commands.execute("ReverseAudio");

  // 4. Inserimos o Device de Reverb
  const reverbDevice = await swellTrack.devices.insert("Reverb");
  
  // 5. Configurar Dry/Wet para 100% e Decay Time para longo
  const dryWetParam = reverbDevice.parameters.find((p: any) => p.name === "Dry/Wet");
  const decayParam = reverbDevice.parameters.find((p: any) => p.name === "Decay Time");

  if (dryWetParam) {
      await dryWetParam.setValue(1.0); // 1.0 representa 100%
  }
  if (decayParam) {
      await decayParam.setValue(3.5); // Decay moderado/longo (em segundos)
  }

  // 6. Freeze & Flatten (A renderização da cauda do reverb)
  api.selection.select(swellTrack);
  
  await api.commands.execute("FreezeTrack");
  await api.commands.execute("FlattenTrack");

  // 7. Inverter o resultado impresso
  const flattenedClip = swellTrack.clips.find((c: any) => c.startTime === clipStartTime);
  
  if (flattenedClip) {
     api.selection.select(flattenedClip);
     await api.commands.execute("ReverseAudio");
     
     console.log("🪄 Reverse Reverb gerado com sucesso! Alinhe o início do clipe com a sua voz.");
  } else {
     console.error("Falha ao localizar o clipe achatado.");
  }
}