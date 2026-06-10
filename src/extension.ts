import {
  initialize,
  ActivationContext,
  AudioClip,
  AudioTrack
} from "@ableton-extensions/sdk";

export function activate(activation: ActivationContext) {
  // Inicializa a API e atrela à versão do SDK
  const api = initialize(activation, "1.0.0");

  // Registra a nossa ação no menu de contexto especificamente para Clipes
  api.ui.registerContextMenuAction(
    "AudioClip", // Escopo do menu de contexto
    "com.revocal.reversereverb", // ID único da ação
    "Reverse Reverb" // Texto exibido no menu
  );

  // Substitua a linha 19 pela sintaxe correta sugerida pelo seu autocomplete:
api.commands.registerCommand("com.revocal.reversereverb", async (context: any) => {
    
    // Aqui entra a sua lógica de verificação
    if (!context.target || context.target.type !== "AudioClip") {
        console.warn("Selecione um clipe de áudio para esta ação.");
        return;
    }

    const clip = context.target;
    
    try {
        await generateReverseReverbSwell(api, clip);
    } catch (error) {
        console.error("Erro ao processar o Reverse Reverb:", error);
    }
});
}

/**
 * Função responsável por orquestrar a lógica assíncrona do Reverse Reverb.
 */
async function generateReverseReverbSwell(api: any, originalClip: AudioClip<any>) {
  const song = api.song;
  const originalTrack = originalClip.parent as AudioTrack<any>;
  
  console.log(`Iniciando processamento para o clipe: ${originalClip.name}`);

  // 1. Criamos uma trilha logo abaixo da original para armazenar o efeito (Swell)
  const swellTrack = await song.createAudioTrack();
  swellTrack.name = `${originalClip.name} - RevRev`;

  // 2. Copiamos o clipe original para a nova trilha
  const clipStartTime = originalClip.startTime;
  const copiedClip = await swellTrack.createAudioClip(originalClip, clipStartTime);

  // 3. Invertemos o Áudio (Reverse)
  api.selection.select(copiedClip);
  await api.commands.execute("ReverseAudio");

  // 4. Inserimos o Device de Reverb
  const reverbDevice = await swellTrack.devices.insert("Reverb");
  
  // 5. Configurar Dry/Wet para 100%
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
  const flattenedClip = swellTrack.clips.find((c: AudioClip<any>) => c.startTime === clipStartTime);
  
  if (flattenedClip) {
     api.selection.select(flattenedClip);
     await api.commands.execute("ReverseAudio");
     
     // Log de sucesso
     console.log("🪄 Reverse Reverb gerado com sucesso! Alinhe o início do clipe com a sua voz.");
  } else {
     console.error("Falha ao localizar o clipe achatado.");
  }
}