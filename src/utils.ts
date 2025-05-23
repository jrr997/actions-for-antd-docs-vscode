import { Octokit } from '@octokit/rest'
import { graphql } from '@octokit/graphql'
import { ANTD_GITHUB, splitText } from './config'

export function getAntdContent(path: string, token: string, ref?: string) {
  return new Octokit({ auth: token }).rest.repos.getContent({
    owner: ANTD_GITHUB.OWNER,
    repo: ANTD_GITHUB.REPO,
    path,
    ref,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
}

export async function getComponentDirInfos(token: string, ref: string) {
  try {
    const response = await getAntdContent('/components', token, ref)
    const { data } = response
    if (Array.isArray(data)) {
      const componentDirInfos = data.filter(item => item.type === 'dir')
      return componentDirInfos
    }
  }
  catch (e: any) {
    console.error('retrieving component dirs failed: ', e)
    if (e.status === 401)
      console.log('github token invalid')
    else
      console.log('e.response.data.message')

    return []
  }
}

export async function getComponentsDocText(componentNames: string[], token: string, ref: string) {
  const queries = componentNames?.map(componentName => createQuery(componentName, ref))

  const { repository } = await graphql<{ repository: Record<string, null | { text: string }> }>(
    `
query{
  repository(owner: "${ANTD_GITHUB.OWNER}", name: "${ANTD_GITHUB.REPO}") {
    ${queries.join('\n')}${createTooltipShareQuery(ref)}
  }
}
    `,
    {
      headers: {
        authorization: `token ${token}`,
      },
    },
  )
  return repository
}

function createTooltipShareQuery(ref: string) {
  if (ref.startsWith('4')) return ''
  
  const name = 'tooltipShared'
  const zhName = `${name.replaceAll('-', splitText)}zh`
  const enName = `${name.replaceAll('-', splitText)}en`
  return `
    ${zhName}: object(expression: "${ref}:components/tooltip/shared/sharedProps.${ANTD_GITHUB.ZH_DOC_NAME}") {
      ... on Blob {
        text
      }
    }
    ${enName}: object(expression: "${ref}:components/tooltip/shared/sharedProps.${ANTD_GITHUB.EN_DOC_NAME}") {
    ... on Blob {
      text
      }
    }
  `
}

function createQuery(componentName: string, ref: string) {
  const zhName = `${componentName.replaceAll('-', splitText)}zh`
  const enName = `${componentName.replaceAll('-', splitText)}en`
  return `
      ${zhName}: object(expression: "${ref}:components/${componentName}/index.${ANTD_GITHUB.ZH_DOC_NAME}") {
        ... on Blob {
          text
        }
      }
      ${enName}: object(expression: "${ref}:components/${componentName}/index.${ANTD_GITHUB.EN_DOC_NAME}") {
        ... on Blob {
          text
        }
      }
  `
}
